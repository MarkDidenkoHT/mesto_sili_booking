const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { addBooking, getBookedDates, getAllBookings, getBookingById, updateBooking, deleteBooking } = require('./db');
const { generateToken, authMiddleware } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('[SERVER] Initializing server...');

// Rate limiting for booking endpoint
const bookingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many booking attempts, please try again later'
});

// Rate limiting for login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later'
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "https://cdn.jsdelivr.net", 
                "https://cdnjs.cloudflare.com"
            ],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "https://fonts.googleapis.com", 
                "https://cdn.jsdelivr.net"
            ],
            fontSrc: [
                "'self'", 
                "data:",
                "https://fonts.gstatic.com"
            ],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: [
                "'self'", 
                "https:", 
                "wss:"
            ],
        },
    },
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin.html', (req, res) => {
    console.log('[ADMIN] Admin panel requested');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin', (req, res) => {
    console.log('[ADMIN] Admin redirect requested');
    res.redirect('/admin.html');
});

app.get('/api/config', (req, res) => {
    console.log('[API] Config request received');
    const apiKey = process.env.WEGLOT_API_KEY;
    res.json({ weglotApiKey: apiKey || null });
});

app.get('/api/booked-dates', async (req, res) => {
    try {
        console.log('[API] Booked dates requested');
        const bookedDates = await getBookedDates();
        res.json({ bookedDates });
    } catch (error) {
        console.error('[API] Error fetching booked dates:', error);
        res.status(500).json({ error: 'Failed to fetch booked dates' });
    }
});

const TELEGRAM_BOT_TOKEN = '7000627860:AAGsYahsW5lVrMyhyy-cGst2fMTx962ktOg';
const TELEGRAM_CHAT_ID = '-3498233200';

async function sendTelegramNotification(booking) {
    try {
        const languageName = { ru: 'Русский', md: 'Moldovenesc', en: 'English' }[booking.language] || booking.language;
        const message = `
📅 <b>Новое бронирование!</b>

👤 <b>Имя:</b> ${booking.name}
📧 <b>Email:</b> ${booking.email}
📞 <b>Телефон:</b> ${booking.phone}
📍 <b>Дата посещения:</b> ${booking.bookingDate}
🌐 <b>Язык клиента:</b> ${languageName}
💬 <b>Пожелания:</b> ${booking.message || 'Нет'}

ID бронирования: #${booking.id}
`;
        
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (!response.ok) {
            console.error('[TELEGRAM] Error sending notification:', response.statusText);
        } else {
            console.log('[TELEGRAM] Notification sent for booking #' + booking.id);
        }
    } catch (error) {
        console.error('[TELEGRAM] Error:', error);
    }
}

app.post('/api/bookings', bookingLimiter, async (req, res) => {
    try {
        console.log('[API] New booking submission:', { name: req.body.name, email: req.body.email });
        const { name, email, phone, bookingDate, message, language } = req.body;

        if (!name || !email || !phone || !bookingDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (phone.length < 10) {
            return res.status(400).json({ error: 'Invalid phone number' });
        }

        const bookingDateObj = new Date(bookingDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (bookingDateObj < today) {
            return res.status(400).json({ error: 'Booking date cannot be in the past' });
        }

        const result = await addBooking({
            name: name.substring(0, 100),
            email: email.substring(0, 100),
            phone: phone.substring(0, 20),
            bookingDate,
            language: language || 'ru',
            message: message ? message.substring(0, 500) : null
        });

        const newBooking = {
            id: result.id,
            name: name.substring(0, 100),
            email: email.substring(0, 100),
            phone: phone.substring(0, 20),
            bookingDate,
            language: language || 'ru',
            message: message ? message.substring(0, 500) : null
        };

        // Send Telegram notification
        sendTelegramNotification(newBooking);

        console.log('[API] Booking created:', result.id);
        res.json({ success: true, bookingId: result.id, message: 'Booking created successfully' });
    } catch (error) {
        console.error('[API] Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

app.post('/api/admin/login', loginLimiter, (req, res) => {
    console.log('[ADMIN] Login attempt:', req.body.login);
    const { login, password } = req.body;

    if (!login || !password) {
        console.log('[ADMIN] Login failed: missing credentials');
        return res.status(400).json({ error: 'Missing login or password' });
    }

    if (login === process.env.ADMIN_LOGIN && password === process.env.ADMIN_PASSWORD) {
        console.log('[ADMIN] Login successful for:', login);
        const token = generateToken({ admin: true });
        res.json({ success: true, token });
    } else {
        console.log('[ADMIN] Login failed: invalid credentials');
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.get('/api/admin/bookings', authMiddleware, async (req, res) => {
    try {
        console.log('[ADMIN] Bookings requested with filters:', req.query);
        const { year, month, confirmed } = req.query;
        const filters = {};

        if (year) filters.year = parseInt(year);
        if (month) filters.month = parseInt(month);
        if (confirmed !== undefined) filters.confirmed = confirmed === 'true';

        const bookings = await getAllBookings(filters);
        console.log('[ADMIN] Bookings fetched:', bookings.length);
        res.json({ bookings });
    } catch (error) {
        console.error('[ADMIN] Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

app.get('/api/admin/bookings/:id', authMiddleware, async (req, res) => {
    try {
        console.log('[ADMIN] Booking requested:', req.params.id);
        const booking = await getBookingById(req.params.id);
        if (!booking) {
            console.log('[ADMIN] Booking not found:', req.params.id);
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json({ booking });
    } catch (error) {
        console.error('[ADMIN] Error fetching booking:', error);
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});

app.put('/api/admin/bookings/:id', authMiddleware, async (req, res) => {
    try {
        console.log('[ADMIN] Booking update requested:', req.params.id);
        const { name, email, phone, bookingDate, guests, message, confirmed } = req.body;
        const booking = await getBookingById(req.params.id);

        if (!booking) {
            console.log('[ADMIN] Booking not found for update:', req.params.id);
            return res.status(404).json({ error: 'Booking not found' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name.substring(0, 100);
        if (email !== undefined) updateData.email = email.substring(0, 100);
        if (phone !== undefined) updateData.phone = phone.substring(0, 20);
        if (bookingDate !== undefined) updateData.bookingDate = bookingDate;
        if (guests !== undefined) updateData.guests = parseInt(guests);
        if (message !== undefined) updateData.message = message ? message.substring(0, 500) : null;
        if (confirmed !== undefined) updateData.confirmed = confirmed;

        const result = await updateBooking(req.params.id, updateData);
        console.log('[ADMIN] Booking updated:', req.params.id);
        res.json({ success: true, message: 'Booking updated successfully' });
    } catch (error) {
        console.error('[ADMIN] Error updating booking:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

app.delete('/api/admin/bookings/:id', authMiddleware, async (req, res) => {
    try {
        console.log('[ADMIN] Booking delete requested:', req.params.id);
        const booking = await getBookingById(req.params.id);
        if (!booking) {
            console.log('[ADMIN] Booking not found for delete:', req.params.id);
            return res.status(404).json({ error: 'Booking not found' });
        }

        await deleteBooking(req.params.id);
        console.log('[ADMIN] Booking deleted:', req.params.id);
        res.json({ success: true, message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('[ADMIN] Error deleting booking:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

app.get('/', (req, res) => {
    console.log('[SERVER] Home page requested');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
    console.log('[SERVER] 404 - Path not found:', req.path);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[SERVER] ✓ Server running on http://localhost:${PORT}`);
    console.log('[SERVER] ✓ Environment variables loaded:', !!process.env.WEGLOT_API_KEY);
    console.log('[SERVER] ✓ Admin login:', process.env.ADMIN_LOGIN);
});
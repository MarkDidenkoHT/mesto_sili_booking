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
        console.log('[API] Booked dates (slots) requested');
        const bookedDates = await getBookedDates();
        res.json({ bookedDates });
    } catch (error) {
        console.error('[API] Error fetching booked dates:', error);
        res.status(500).json({ error: 'Failed to fetch booked dates' });
    }
});

const TELEGRAM_BOT_TOKEN = '7000627860:AAGsYahsW5lVrMyhyy-cGst2fMTx962ktOg';
const TELEGRAM_CHAT_ID = '-1003498233200';

async function sendTelegramNotification(booking) {
    try {
        const languageName = { ru: 'Русский', md: 'Moldovenesc', en: 'English' }[booking.language] || booking.language;
        const message = `
📅 <b>Новое бронирование!</b>

👤 <b>Имя:</b> ${booking.name}
📧 <b>Email:</b> ${booking.email}
📞 <b>Телефон:</b> ${booking.phone}
📍 <b>Дата:</b> ${booking.bookingDate}
⏰ <b>Время:</b> ${booking.startTime || '-'} — ${booking.endTime || '-'}
🏷️ <b>Ресурс:</b> ${booking.resourceType || '-'}
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

        const responseText = await response.text();
        
        if (!response.ok) {
            console.error('[TELEGRAM] Error sending notification. Status:', response.status);
            console.error('[TELEGRAM] Telegram API response:', responseText);
        } else {
            console.log('[TELEGRAM] Notification sent for booking #' + booking.id);
        }
    } catch (error) {
        console.error('[TELEGRAM] Fetch error:', error);
    }
}

function timeToMinutes(t) {
    const [h, m] = (t || '').split(':').map(Number);
    return (Number.isFinite(h) && Number.isFinite(m)) ? h * 60 + m : null;
}

function hasTimeConflict(newStartMin, newEndMin, newResource, newDate, existingBookings, newId = null) {
    for (const eb of existingBookings) {
        if (newId && eb.id === Number(newId)) continue;
        const ebStart = timeToMinutes(eb.startTime);
        const ebEnd = timeToMinutes(eb.endTime);
        if (ebStart === null || ebEnd === null) continue;

        const gapExisting = eb.resourceType === 'sauna' ? 120 : 60; // in minutes
        const gapNew = newResource === 'sauna' ? 120 : 60;

        const ok1 = (ebEnd + gapExisting) <= newStartMin;

        const ok2 = (newEndMin + gapNew) <= ebStart;

        if (!(ok1 || ok2)) {
            return true; 
        }
    }
    return false;
}

app.post('/api/bookings', bookingLimiter, async (req, res) => {
    try {
        console.log('[API] New booking submission:', { name: req.body.name, email: req.body.email, resource: req.body.resourceType });
        const { name, email, phone, bookingDate, message, language, resourceType, startTime, endTime } = req.body;

        if (!name || !email || !phone || !bookingDate || !startTime || !endTime || !resourceType) {
            return res.status(400).json({ errorCode: 'missing_fields' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ errorCode: 'invalid_email' });
        }

        if (phone.length < 8) {
            return res.status(400).json({ errorCode: 'invalid_phone' });
        }

        if (!['sauna', 'veranda'].includes(resourceType)) {
            return res.status(400).json({ errorCode: 'invalid_resource' });
        }

        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            return res.status(400).json({ errorCode: 'invalid_time_format' });
        }

        const startMin = timeToMinutes(startTime);
        const endMin = timeToMinutes(endTime);

        if (startMin >= endMin) {
            return res.status(400).json({ errorCode: 'invalid_time_range' });
        }

        const durationHours = (endMin - startMin) / 60;
        const minHours = resourceType === 'sauna' ? 4 : 2;
        if (durationHours < minHours) {
            return res.status(400).json({ errorCode: resourceType === 'sauna' ? 'min_duration_sauna' : 'min_duration_veranda' });
        }

        const bookingDateObj = new Date(bookingDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (bookingDateObj < today) {
            return res.status(400).json({ errorCode: 'past_date' });
        }

        const existing = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM bookings WHERE bookingDate = ? AND resourceType = ? AND confirmed = 1', [bookingDate, resourceType], (err, rows) => {
                if (err) reject(err); else resolve(rows || []);
            });
        });

        if (hasTimeConflict(startMin, endMin, resourceType, bookingDate, existing)) {
            return res.status(400).json({ errorCode: 'time_conflict' });
        }

        const result = await addBooking({
            name: name.substring(0, 100),
            email: email.substring(0, 100),
            phone: phone.substring(0, 20),
            bookingDate,
            startTime,
            endTime,
            resourceType,
            language: language || 'ru',
            message: message ? message.substring(0, 500) : null
        });

        const newBooking = {
            id: result.id,
            name: name.substring(0, 100),
            email: email.substring(0, 100),
            phone: phone.substring(0, 20),
            bookingDate,
            startTime,
            endTime,
            resourceType,
            language: language || 'ru',
            message: message ? message.substring(0, 500) : null
        };

        sendTelegramNotification(newBooking);

        console.log('[API] Booking created:', result.id);
        res.json({ success: true, bookingId: result.id, message: 'Booking created successfully' });
    } catch (error) {
        console.error('[API] Error creating booking:', error);
        res.status(500).json({ errorCode: 'booking_failed' });
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
        const { name, email, phone, bookingDate, guests, message, confirmed, resourceType, startTime, endTime } = req.body;
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
        if (resourceType !== undefined) updateData.resourceType = resourceType;
        if (startTime !== undefined) updateData.startTime = startTime;
        if (endTime !== undefined) updateData.endTime = endTime;

        if (updateData.confirmed === 1 || updateData.startTime !== undefined || updateData.endTime !== undefined || updateData.resourceType !== undefined || updateData.bookingDate !== undefined) {
            const newResource = updateData.resourceType || booking.resourceType;
            const newStart = updateData.startTime || booking.startTime;
            const newEnd = updateData.endTime || booking.endTime;
            const newDate = updateData.bookingDate || booking.bookingDate;

            if (!newStart || !newEnd || !newResource) {
                return res.status(400).json({ error: 'Missing resource/time for validation' });
            }

            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
            if (!timeRegex.test(newStart) || !timeRegex.test(newEnd)) {
                return res.status(400).json({ errorCode: 'invalid_time_format' });
            }

            const startMin = timeToMinutes(newStart);
            const endMin = timeToMinutes(newEnd);
            if (startMin >= endMin) {
                return res.status(400).json({ errorCode: 'invalid_time_range' });
            }

            const durationHours = (endMin - startMin) / 60;
            const minHours = newResource === 'sauna' ? 4 : 2;
            if (durationHours < minHours) {
                return res.status(400).json({ errorCode: newResource === 'sauna' ? 'min_duration_sauna' : 'min_duration_veranda' });
            }

            const existing = await new Promise((resolve, reject) => {
                db.all('SELECT * FROM bookings WHERE bookingDate = ? AND resourceType = ? AND confirmed = 1', [newDate, newResource], (err, rows) => {
                    if (err) reject(err); else resolve(rows || []);
                });
            });

            if (hasTimeConflict(startMin, endMin, newResource, newDate, existing, req.params.id)) {
                return res.status(400).json({ errorCode: 'time_conflict' });
            }
        }

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
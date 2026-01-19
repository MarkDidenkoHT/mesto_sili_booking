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
                "https://cdnjs.cloudflare.com", 
                "https://telegram.org", 
                "https://esm.sh",
                "https://cdn.weglot.com",
                "https://api.weglot.com" 
            ],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "https://fonts.googleapis.com", 
                "https://cdn.jsdelivr.net",
                "https://cdn.weglot.com"
            ],
            fontSrc: [
                "'self'", 
                "data:",
                "https://fonts.gstatic.com",
                "https://cdn.weglot.com"
            ],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: [
                "'self'", 
                "https:", 
                "wss:", 
                "https://api.weglot.com"
            ],
        },
    },
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// Public endpoints
app.get('/api/config', (req, res) => {
    console.log('Config request received');
    const apiKey = process.env.WEGLOT_API_KEY;
    res.json({ weglotApiKey: apiKey || null });
});

app.get('/api/booked-dates', async (req, res) => {
    try {
        const bookedDates = await getBookedDates();
        res.json({ bookedDates });
    } catch (error) {
        console.error('Error fetching booked dates:', error);
        res.status(500).json({ error: 'Failed to fetch booked dates' });
    }
});

app.post('/api/bookings', bookingLimiter, async (req, res) => {
    try {
        const { name, email, phone, checkIn, checkOut, guests, message } = req.body;

        if (!name || !email || !phone || !checkIn || !checkOut || !guests) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (phone.length < 10) {
            return res.status(400).json({ error: 'Invalid phone number' });
        }

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (checkInDate < today) {
            return res.status(400).json({ error: 'Check-in date cannot be in the past' });
        }

        if (checkOutDate <= checkInDate) {
            return res.status(400).json({ error: 'Check-out date must be after check-in date' });
        }

        const result = await addBooking({
            name: name.substring(0, 100),
            email: email.substring(0, 100),
            phone: phone.substring(0, 20),
            checkIn,
            checkOut,
            guests: parseInt(guests),
            message: message ? message.substring(0, 500) : null
        });

        res.json({ success: true, bookingId: result.id, message: 'Booking created successfully' });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// Admin endpoints
app.post('/api/admin/login', loginLimiter, (req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ error: 'Missing login or password' });
    }

    if (login === process.env.ADMIN_LOGIN && password === process.env.ADMIN_PASSWORD) {
        const token = generateToken({ admin: true });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.get('/api/admin/bookings', authMiddleware, async (req, res) => {
    try {
        const { year, month, confirmed } = req.query;
        const filters = {};

        if (year) filters.year = parseInt(year);
        if (month) filters.month = parseInt(month);
        if (confirmed !== undefined) filters.confirmed = confirmed === 'true';

        const bookings = await getAllBookings(filters);
        res.json({ bookings });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

app.get('/api/admin/bookings/:id', authMiddleware, async (req, res) => {
    try {
        const booking = await getBookingById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json({ booking });
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});

app.put('/api/admin/bookings/:id', authMiddleware, async (req, res) => {
    try {
        const { name, email, phone, checkIn, checkOut, guests, message, confirmed } = req.body;
        const booking = await getBookingById(req.params.id);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name.substring(0, 100);
        if (email !== undefined) updateData.email = email.substring(0, 100);
        if (phone !== undefined) updateData.phone = phone.substring(0, 20);
        if (checkIn !== undefined) updateData.checkIn = checkIn;
        if (checkOut !== undefined) updateData.checkOut = checkOut;
        if (guests !== undefined) updateData.guests = parseInt(guests);
        if (message !== undefined) updateData.message = message ? message.substring(0, 500) : null;
        if (confirmed !== undefined) updateData.confirmed = confirmed;

        const result = await updateBooking(req.params.id, updateData);
        res.json({ success: true, message: 'Booking updated successfully' });
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

app.delete('/api/admin/bookings/:id', authMiddleware, async (req, res) => {
    try {
        const booking = await getBookingById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        await deleteBooking(req.params.id);
        res.json({ success: true, message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Environment variables loaded:', !!process.env.WEGLOT_API_KEY);
});
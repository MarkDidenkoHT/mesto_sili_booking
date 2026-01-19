const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { addBooking, getAllBookedDates } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting for booking endpoint
const bookingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many booking attempts, please try again later'
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

app.get('/api/config', (req, res) => {
    console.log('Config request received');
    const apiKey = process.env.WEGLOT_API_KEY;
    console.log('WEGLOT_API_KEY available:', !!apiKey);
    if (apiKey) {
        console.log('API Key found:', apiKey.substring(0, 10) + '...');
    }
    res.json({
        weglotApiKey: apiKey || null
    });
});

app.get('/api/booked-dates', async (req, res) => {
    try {
        const bookedDates = await getAllBookedDates();
        res.json({ bookedDates });
    } catch (error) {
        console.error('Error fetching booked dates:', error);
        res.status(500).json({ error: 'Failed to fetch booked dates' });
    }
});

app.post('/api/bookings', bookingLimiter, async (req, res) => {
    try {
        const { name, email, phone, checkIn, checkOut, guests, message } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !checkIn || !checkOut || !guests) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate phone format (basic)
        if (phone.length < 10) {
            return res.status(400).json({ error: 'Invalid phone number' });
        }

        // Validate dates
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

        // Add booking to database
        const result = await addBooking({
            name: name.substring(0, 100),
            email: email.substring(0, 100),
            phone: phone.substring(0, 20),
            checkIn,
            checkOut,
            guests: parseInt(guests),
            message: message ? message.substring(0, 500) : null
        });

        res.json({ 
            success: true, 
            bookingId: result.id,
            message: 'Booking created successfully' 
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
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
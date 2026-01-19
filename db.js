const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'bookings.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            checkIn TEXT NOT NULL,
            checkOut TEXT NOT NULL,
            guests INTEGER NOT NULL,
            message TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'pending'
        )
    `, (err) => {
        if (err) {
            console.error('Error creating bookings table:', err.message);
        } else {
            console.log('Bookings table initialized');
        }
    });
}

function addBooking(bookingData) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO bookings (name, email, phone, checkIn, checkOut, guests, message) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                bookingData.name,
                bookingData.email,
                bookingData.phone,
                bookingData.checkIn,
                bookingData.checkOut,
                bookingData.guests,
                bookingData.message || null
            ],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            }
        );
    });
}

function getBookedDates(startDate, endDate) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT checkIn, checkOut FROM bookings 
             WHERE status = 'pending' OR status = 'confirmed'
             AND (
                (checkIn <= ? AND checkOut > ?)
                OR (checkIn < ? AND checkOut >= ?)
                OR (checkIn >= ? AND checkOut <= ?)
             )`,
            [endDate, startDate, endDate, startDate, startDate, endDate],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            }
        );
    });
}

function getAllBookedDates() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT checkIn, checkOut FROM bookings 
             WHERE status = 'pending' OR status = 'confirmed'`,
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            }
        );
    });
}

module.exports = {
    db,
    addBooking,
    getBookedDates,
    getAllBookedDates
};

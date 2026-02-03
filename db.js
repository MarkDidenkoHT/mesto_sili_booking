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
            bookingDate TEXT NOT NULL,
            language TEXT DEFAULT 'ru',
            message TEXT,
            confirmed INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
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
            `INSERT INTO bookings (name, email, phone, bookingDate, language, message, confirmed) 
             VALUES (?, ?, ?, ?, ?, ?, 0)`,
            [
                bookingData.name,
                bookingData.email,
                bookingData.phone,
                bookingData.bookingDate,
                bookingData.language || 'ru',
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

function getBookedDates() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT bookingDate FROM bookings 
             WHERE confirmed = 1`,
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

function getAllBookings(filters = {}) {
    return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM bookings WHERE 1=1';
        const params = [];

        if (filters.year) {
            query += ' AND strftime("%Y", bookingDate) = ?';
            params.push(filters.year.toString());
        }

        if (filters.month) {
            query += ' AND strftime("%m", bookingDate) = ?';
            params.push(String(filters.month).padStart(2, '0'));
        }

        if (filters.confirmed !== undefined) {
            query += ' AND confirmed = ?';
            params.push(filters.confirmed ? 1 : 0);
        }

        query += ' ORDER BY bookingDate DESC';

        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows || []);
            }
        });
    });
}

function getBookingById(id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function updateBooking(id, updateData) {
    return new Promise((resolve, reject) => {
        const fields = [];
        const values = [];

        if (updateData.name !== undefined) {
            fields.push('name = ?');
            values.push(updateData.name);
        }
        if (updateData.email !== undefined) {
            fields.push('email = ?');
            values.push(updateData.email);
        }
        if (updateData.phone !== undefined) {
            fields.push('phone = ?');
            values.push(updateData.phone);
        }
        if (updateData.bookingDate !== undefined) {
            fields.push('bookingDate = ?');
            values.push(updateData.bookingDate);
        }
        if (updateData.language !== undefined) {
            fields.push('language = ?');
            values.push(updateData.language);
        }
        if (updateData.message !== undefined) {
            fields.push('message = ?');
            values.push(updateData.message);
        }
        if (updateData.confirmed !== undefined) {
            fields.push('confirmed = ?');
            values.push(updateData.confirmed ? 1 : 0);
        }

        fields.push('updatedAt = CURRENT_TIMESTAMP');
        values.push(id);

        if (fields.length === 1) {
            reject(new Error('No fields to update'));
            return;
        }

        const query = `UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`;

        db.run(query, values, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id, changes: this.changes });
            }
        });
    });
}

function deleteBooking(id) {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM bookings WHERE id = ?', [id], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id, deleted: this.changes > 0 });
            }
        });
    });
}

module.exports = {
    db,
    addBooking,
    getBookedDates,
    getAllBookings,
    getBookingById,
    updateBooking,
    deleteBooking
};
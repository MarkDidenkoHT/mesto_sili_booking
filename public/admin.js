let token = localStorage.getItem('adminToken');

const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const loginError = document.getElementById('loginError');

const yearFilter = document.getElementById('yearFilter');
const monthFilter = document.getElementById('monthFilter');
const statusFilter = document.getElementById('statusFilter');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const addBookingBtn = document.getElementById('addBookingBtn');
const bookingsBody = document.getElementById('bookingsBody');

const bookingModal = document.getElementById('bookingModal');
const bookingForm = document.getElementById('bookingForm');
const modalTitle = document.getElementById('modalTitle');
const modalClose = document.getElementById('modalClose');
const modalCancelBtn = document.getElementById('modalCancelBtn');

let currentBookingId = null;

// Check if already logged in
if (token) {
    showDashboard();
} else {
    showLogin();
}

function showLogin() {
    loginPage.style.display = 'flex';
    dashboardPage.style.display = 'none';
    token = null;
}

function showDashboard() {
    loginPage.style.display = 'none';
    dashboardPage.style.display = 'block';
    populateYearFilter();
    loadBookings();
}

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;
    
    loginError.classList.remove('show');
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });
        
        if (!response.ok) {
            throw new Error('Invalid credentials');
        }
        
        const data = await response.json();
        token = data.token;
        localStorage.setItem('adminToken', token);
        
        loginForm.reset();
        showDashboard();
    } catch (error) {
        loginError.textContent = 'Ошибка: ' + error.message;
        loginError.classList.add('show');
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    showLogin();
});

// Populate year filter
function populateYearFilter() {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i <= currentYear + 2; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearFilter.appendChild(option);
    }
}

// Load bookings
async function loadBookings() {
    try {
        const params = new URLSearchParams();
        
        if (yearFilter.value) params.append('year', yearFilter.value);
        if (monthFilter.value) params.append('month', monthFilter.value);
        if (statusFilter.value !== '') params.append('confirmed', statusFilter.value);
        
        const response = await fetch(`/api/admin/bookings?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load bookings');
        
        const data = await response.json();
        renderBookings(data.bookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
        alert('Ошибка загрузки бронирований');
    }
}

// Render bookings
function renderBookings(bookings) {
    bookingsBody.innerHTML = '';
    
    if (bookings.length === 0) {
        bookingsBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Бронирования не найдены</td></tr>';
        return;
    }
    
    bookings.forEach(booking => {
        const row = document.createElement('tr');
        const statusClass = booking.confirmed ? 'status-confirmed' : 'status-pending';
        const statusText = booking.confirmed ? 'Подтверждено' : 'Ожидает';
        
        row.innerHTML = `
            <td>${booking.id}</td>
            <td>${booking.name}</td>
            <td>${booking.email}</td>
            <td>${booking.phone}</td>
            <td>${booking.checkIn}</td>
            <td>${booking.checkOut}</td>
            <td>${booking.guests}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-edit" onclick="editBooking(${booking.id})">Редактировать</button>
                    <button class="btn btn-delete" onclick="deleteBooking(${booking.id})">Удалить</button>
                </div>
            </td>
        `;
        bookingsBody.appendChild(row);
    });
}

// Apply filters
applyFiltersBtn.addEventListener('click', loadBookings);

// Add booking
addBookingBtn.addEventListener('click', () => {
    currentBookingId = null;
    modalTitle.textContent = 'Добавить бронирование';
    bookingForm.reset();
    bookingModal.classList.add('active');
});

// Edit booking
async function editBooking(id) {
    try {
        const response = await fetch(`/api/admin/bookings/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load booking');
        
        const data = await response.json();
        const booking = data.booking;
        
        currentBookingId = id;
        modalTitle.textContent = 'Редактировать бронирование';
        
        document.getElementById('bName').value = booking.name;
        document.getElementById('bEmail').value = booking.email;
        document.getElementById('bPhone').value = booking.phone;
        document.getElementById('bGuests').value = booking.guests;
        document.getElementById('bCheckIn').value = booking.checkIn;
        document.getElementById('bCheckOut').value = booking.checkOut;
        document.getElementById('bMessage').value = booking.message || '';
        document.getElementById('bConfirmed').checked = booking.confirmed === 1;
        
        bookingModal.classList.add('active');
    } catch (error) {
        console.error('Error loading booking:', error);
        alert('Ошибка загрузки бронирования');
    }
}

// Delete booking
async function deleteBooking(id) {
    if (!confirm('Вы уверены, что хотите удалить это бронирование?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/bookings/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete booking');
        
        loadBookings();
    } catch (error) {
        console.error('Error deleting booking:', error);
        alert('Ошибка удаления бронирования');
    }
}

// Save booking
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(bookingForm);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        guests: formData.get('guests'),
        checkIn: formData.get('checkIn'),
        checkOut: formData.get('checkOut'),
        message: formData.get('message'),
        confirmed: formData.get('confirmed') === 'on'
    };
    
    try {
        const method = currentBookingId ? 'PUT' : 'POST';
        const url = currentBookingId 
            ? `/api/admin/bookings/${currentBookingId}`
            : '/api/admin/bookings';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Failed to save booking');
        
        bookingModal.classList.remove('active');
        loadBookings();
    } catch (error) {
        console.error('Error saving booking:', error);
        alert('Ошибка сохранения бронирования');
    }
});

// Modal controls
modalClose.addEventListener('click', () => {
    bookingModal.classList.remove('active');
});

modalCancelBtn.addEventListener('click', () => {
    bookingModal.classList.remove('active');
});

bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) {
        bookingModal.classList.remove('active');
    }
});

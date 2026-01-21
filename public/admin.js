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

console.log('[ADMIN-JS] Filter elements check:', {
    yearFilter: !!yearFilter,
    monthFilter: !!monthFilter,
    statusFilter: !!statusFilter,
    applyFiltersBtn: !!applyFiltersBtn,
    addBookingBtn: !!addBookingBtn,
    bookingsBody: !!bookingsBody
});

let currentBookingId = null;

if (token) {
    showDashboard();
} else {
    showLogin();
}

function showLogin() {
    console.log('[ADMIN-JS] Showing login page');
    loginPage.style.display = 'flex';
    dashboardPage.style.display = 'none';
    token = null;
}

function showDashboard() {
    console.log('[ADMIN-JS] Showing dashboard');
    loginPage.style.display = 'none';
    dashboardPage.style.display = 'block';
    populateYearFilter();
    loadBookings();
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;
    
    console.log('[ADMIN-JS] Login attempt:', login);
    loginError.classList.remove('show');
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });
        
        console.log('[ADMIN-JS] Login response status:', response.status);
        
        if (!response.ok) {
            throw new Error('Invalid credentials');
        }
        
        const data = await response.json();
        console.log('[ADMIN-JS] Login successful, token received');
        token = data.token;
        localStorage.setItem('adminToken', token);
        
        loginForm.reset();
        showDashboard();
    } catch (error) {
        console.error('[ADMIN-JS] Login error:', error);
        loginError.textContent = 'Ошибка: ' + error.message;
        loginError.classList.add('show');
    }
});

logoutBtn.addEventListener('click', () => {
    console.log('[ADMIN-JS] Logout clicked');
    localStorage.removeItem('adminToken');
    showLogin();
});

function populateYearFilter() {
    console.log('[ADMIN-JS] Populating year filter');
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i <= currentYear + 2; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearFilter.appendChild(option);
    }
}

async function loadBookings() {
    try {
        console.log('[ADMIN-JS] Loading bookings...');
        const params = new URLSearchParams();
        
        if (yearFilter.value) params.append('year', yearFilter.value);
        if (monthFilter.value) params.append('month', monthFilter.value);
        if (statusFilter.value !== '') params.append('confirmed', statusFilter.value);
        
        console.log('[ADMIN-JS] Filter params:', params.toString());
        
        const response = await fetch(`/api/admin/bookings?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('[ADMIN-JS] Bookings response status:', response.status);
        
        if (!response.ok) throw new Error('Failed to load bookings');
        
        const data = await response.json();
        console.log('[ADMIN-JS] Bookings loaded:', data.bookings.length);
        renderBookings(data.bookings);
    } catch (error) {
        console.error('[ADMIN-JS] Error loading bookings:', error);
        alert('Ошибка загрузки бронирований');
    }
}

function renderBookings(bookings) {
    console.log('[ADMIN-JS] Rendering', bookings.length, 'bookings');
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
            <td>${booking.bookingDate}</td>
            <td>${booking.guests}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-edit" data-action="edit" data-id="${booking.id}">Редактировать</button>
                    <button class="btn btn-delete" data-action="delete" data-id="${booking.id}">Удалить</button>
                </div>
            </td>
        `;
        bookingsBody.appendChild(row);
    });
}

bookingsBody.addEventListener('click', async (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    
    const action = button.dataset.action;
    const id = parseInt(button.dataset.id);
    
    if (action === 'edit') {
        editBooking(id);
    } else if (action === 'delete') {
        deleteBooking(id);
    }
});

applyFiltersBtn.addEventListener('click', loadBookings);

addBookingBtn.addEventListener('click', () => {
    console.log('[ADMIN-JS] Add booking clicked');
    currentBookingId = null;
    modalTitle.textContent = 'Добавить бронирование';
    bookingForm.reset();
    bookingModal.classList.add('active');
});

async function editBooking(id) {
    try {
        console.log('[ADMIN-JS] Edit booking:', id);
        const response = await fetch(`/api/admin/bookings/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('[ADMIN-JS] Edit response status:', response.status);
        
        if (!response.ok) throw new Error('Failed to load booking');
        
        const data = await response.json();
        const booking = data.booking;
        
        currentBookingId = id;
        modalTitle.textContent = 'Редактировать бронирование';
        
        document.getElementById('bName').value = booking.name;
        document.getElementById('bEmail').value = booking.email;
        document.getElementById('bPhone').value = booking.phone;
        document.getElementById('bGuests').value = booking.guests;
        document.getElementById('bBookingDate').value = booking.bookingDate;
        document.getElementById('bMessage').value = booking.message || '';
        document.getElementById('bConfirmed').checked = booking.confirmed === 1;
        
        bookingModal.classList.add('active');
    } catch (error) {
        console.error('[ADMIN-JS] Error loading booking:', error);
        alert('Ошибка загрузки бронирования');
    }
}

async function deleteBooking(id) {
    console.log('[ADMIN-JS] Delete booking:', id);
    if (!confirm('Вы уверены, что хотите удалить это бронирование?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/bookings/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('[ADMIN-JS] Delete response status:', response.status);
        
        if (!response.ok) throw new Error('Failed to delete booking');
        
        loadBookings();
    } catch (error) {
        console.error('[ADMIN-JS] Error deleting booking:', error);
        alert('Ошибка удаления бронирования');
    }
}

bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    console.log('[ADMIN-JS] Saving booking, currentBookingId:', currentBookingId);
    
    const formData = new FormData(bookingForm);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        guests: formData.get('guests'),
        bookingDate: formData.get('bookingDate'),
        message: formData.get('message'),
        confirmed: formData.get('confirmed') === 'on'
    };
    
    try {
        const method = currentBookingId ? 'PUT' : 'POST';
        const url = currentBookingId 
            ? `/api/admin/bookings/${currentBookingId}`
            : '/api/admin/bookings';
        
        console.log('[ADMIN-JS] Save request:', method, url);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        console.log('[ADMIN-JS] Save response status:', response.status);
        
        if (!response.ok) throw new Error('Failed to save booking');
        
        console.log('[ADMIN-JS] Booking saved successfully');
        bookingModal.classList.remove('active');
        loadBookings();
    } catch (error) {
        console.error('[ADMIN-JS] Error saving booking:', error);
        alert('Ошибка сохранения бронирования');
    }
});

modalClose.addEventListener('click', () => {
    console.log('[ADMIN-JS] Modal close clicked');
    bookingModal.classList.remove('active');
});

modalCancelBtn.addEventListener('click', () => {
    console.log('[ADMIN-JS] Modal cancel clicked');
    bookingModal.classList.remove('active');
});

bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) {
        console.log('[ADMIN-JS] Modal background clicked');
        bookingModal.classList.remove('active');
    }
});

console.log('[ADMIN-JS] Initialization complete');

let token = localStorage.getItem('adminToken');
let currentBookingId = null;

const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const yearFilter = document.getElementById('yearFilter');
const monthFilter = document.getElementById('monthFilter');
const statusFilter = document.getElementById('statusFilter');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const refreshBookingsBtn = document.getElementById('refreshBookingsBtn');

const addBookingBtn = document.getElementById('addBookingBtn');
const bookingsBody = document.getElementById('bookingsBody');
const bookingsCount = document.getElementById('bookingsCount');

const bookingModal = document.getElementById('bookingModal');
const bookingForm = document.getElementById('bookingForm');
const modalTitle = document.getElementById('modalTitle');
const modalClose = document.getElementById('modalClose');
const modalCancelBtn = document.getElementById('modalCancelBtn');

const toastContainer = document.getElementById('toastContainer');

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

function showToast(message, type = 'info', title = '') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loading-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
    
    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;
    
    loginError.textContent = '';
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });
        
        if (!response.ok) {
            throw new Error('Неверный логин или пароль');
        }
        
        const data = await response.json();
        token = data.token;
        localStorage.setItem('adminToken', token);
        
        loginForm.reset();
        showDashboard();
        showToast('Успешный вход в систему', 'success', 'Добро пожаловать!');
    } catch (error) {
        loginError.textContent = error.message;
        showToast(error.message, 'error', 'Ошибка входа');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    showLogin();
    showToast('Вы вышли из системы', 'info');
});

function populateYearFilter() {
    const currentYear = new Date().getFullYear();
    yearFilter.innerHTML = '<option value="">Все годы</option>';
    
    for (let i = currentYear - 1; i <= currentYear + 2; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearFilter.appendChild(option);
    }
}

async function loadBookings() {
    try {
        bookingsBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="7">
                    <div class="loading-spinner"></div>
                    <p>Загрузка данных...</p>
                </td>
            </tr>
        `;
        
        const params = new URLSearchParams();
        if (yearFilter.value) params.append('year', yearFilter.value);
        if (monthFilter.value) params.append('month', monthFilter.value);
        if (statusFilter.value !== '') params.append('confirmed', statusFilter.value);
        
        const response = await fetch(`/api/admin/bookings?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            showToast('Сессия истекла. Пожалуйста, войдите снова.', 'error', 'Требуется авторизация');
            showLogin();
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load bookings');
        
        const data = await response.json();
        renderBookings(data.bookings);
        
        bookingsCount.textContent = `${data.bookings.length} ${getBookingWord(data.bookings.length)}`;
    } catch (error) {
        console.error('Error loading bookings:', error);
        showToast('Не удалось загрузить бронирования', 'error', 'Ошибка загрузки');
        bookingsBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="7">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <h3>Ошибка загрузки</h3>
                    <p>Попробуйте обновить страницу</p>
                </td>
            </tr>
        `;
    }
}

function getBookingWord(count) {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'записей';
    if (lastDigit === 1) return 'запись';
    if (lastDigit >= 2 && lastDigit <= 4) return 'записи';
    return 'записей';
}

function renderBookings(bookings) {
    bookingsBody.innerHTML = '';
    
    if (bookings.length === 0) {
        bookingsBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="9">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <h3>Бронирования не найдены</h3>
                    <p>Попробуйте изменить фильтры или добавить новое бронирование</p>
                </td>
            </tr>
        `;
        return;
    }
    
    bookings.forEach(booking => {
        const row = document.createElement('tr');
        const statusClass = booking.confirmed ? 'status-confirmed' : 'status-pending';
        const statusText = booking.confirmed ? 'Подтверждено' : 'Ожидает';
        const languageName = {
            ru: 'Русский',
            md: 'Moldovenesc',
            en: 'English'
        }[booking.language] || booking.language;
        
        const formattedDate = new Date(booking.bookingDate).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const timeRange = booking.startTime && booking.endTime ? `${booking.startTime} — ${booking.endTime}` : '-';
        const resourceName = booking.resourceType === 'sauna' ? 'Сауна' : (booking.resourceType === 'veranda' ? 'Веранда' : booking.resourceType);

        row.innerHTML = `
            <td><strong>#${booking.id}</strong></td>
            <td>${escapeHtml(booking.name)}</td>
            <td>
                <div class="contact-info">
                    <div class="contact-email">${escapeHtml(booking.email)}</div>
                    <div class="contact-phone">${escapeHtml(booking.phone)}</div>
                </div>
            </td>
            <td>${formattedDate}</td>
            <td>${languageName}</td>
            <td>${resourceName}</td>
            <td>${timeRange}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-sm btn-success" data-action="edit" data-id="${booking.id}" title="Редактировать">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        <span>Редактировать</span>
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${booking.id}" title="Удалить">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        <span>Удалить</span>
                    </button>
                </div>
            </td>
        `;
        bookingsBody.appendChild(row);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
        document.getElementById('bBookingDate').value = booking.bookingDate;
        document.getElementById('bLanguage').value = booking.language || 'ru';
        document.getElementById('bMessage').value = booking.message || '';
        document.getElementById('bConfirmed').checked = booking.confirmed === 1;

        document.getElementById('bResource').value = booking.resourceType || 'sauna';
        document.getElementById('bStartTime').value = booking.startTime || '';
        document.getElementById('bEndTime').value = booking.endTime || '';
        
        bookingModal.classList.add('active');
    } catch (error) {
        console.error('Error loading booking:', error);
        showToast('Не удалось загрузить данные бронирования', 'error', 'Ошибка');
    }
}

async function deleteBooking(id) {
    if (!confirm('Вы уверены, что хотите удалить это бронирование? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/bookings/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete booking');
        
        showToast('Бронирование успешно удалено', 'success');
        loadBookings();
    } catch (error) {
        console.error('Error deleting booking:', error);
        showToast('Не удалось удалить бронирование', 'error', 'Ошибка');
    }
}

addBookingBtn.addEventListener('click', () => {
    currentBookingId = null;
    modalTitle.textContent = 'Добавить бронирование';
    bookingForm.reset();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bBookingDate').value = today;
    
    bookingModal.classList.add('active');
});

bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = bookingForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loading-spinner" style="width: 16px; height: 16px; border-width: 2px;"></div><span>Сохранение...</span>';
    
    const formData = new FormData(bookingForm);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        bookingDate: formData.get('bookingDate'),
        language: formData.get('language'),
        message: formData.get('message') || '',
        confirmed: formData.get('confirmed') === 'on',
        resourceType: formData.get('resource') || 'sauna',
        startTime: formData.get('startTime') || '',
        endTime: formData.get('endTime') || ''
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
        
        const actionText = currentBookingId ? 'обновлено' : 'создано';
        showToast(`Бронирование успешно ${actionText}`, 'success');
        
        bookingModal.classList.remove('active');
        loadBookings();
    } catch (error) {
        console.error('Error saving booking:', error);
        showToast('Не удалось сохранить бронирование', 'error', 'Ошибка');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

function closeModal() {
    bookingModal.classList.remove('active');
    bookingForm.reset();
    currentBookingId = null;
}

modalClose.addEventListener('click', closeModal);
modalCancelBtn.addEventListener('click', closeModal);

bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bookingModal.classList.contains('active')) {
        closeModal();
    }
});

applyFiltersBtn.addEventListener('click', loadBookings);
refreshBookingsBtn.addEventListener('click', () => {
    showToast('Обновление данных...', 'info');
    loadBookings();
});

[yearFilter, monthFilter, statusFilter].forEach(filter => {
    filter.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadBookings();
        }
    });
});

console.log('Admin panel initialized successfully');
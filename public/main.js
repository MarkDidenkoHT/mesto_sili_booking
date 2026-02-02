let currentLanguage = localStorage.getItem('language') || 'ru';
let translations = null;

function loadTranslations() {
    
    if (!window.translations) {
        setTimeout(loadTranslations, 50);
        return;
    }
    
    translations = window.translations;
    updatePageText();
    initializeLanguageSwitcher();
}

function t(key) {
    const keys = key.split('.');
    let value = translations[currentLanguage];
    
    for (const k of keys) {
        if (value && typeof value === 'object') {
            value = value[k];
        } else {
            return key;
        }
    }
    
    return value || key;
}

function updatePageText() {
    // Update text content
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translatedText = t(key);
        
        if (element.tagName === 'OPTION') {
            element.textContent = translatedText;
        } else {
            element.textContent = translatedText;
        }
    });

    document.querySelectorAll('[data-i18n-html]').forEach(element => {
        const key = element.getAttribute('data-i18n-html');
        element.innerHTML = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const translatedPlaceholder = t(key);
        element.placeholder = translatedPlaceholder;
    });
}

const languageSwitcher = document.getElementById('languageSwitcher');
const langOptions = [
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ro', name: 'Română', flag: '🇷🇴' }
];

function initializeLanguageSwitcher() {
    langOptions.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = `${lang.flag} ${lang.name}`;
        languageSwitcher.appendChild(option);
    });
    languageSwitcher.value = currentLanguage;
    languageSwitcher.addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });
}

function setLanguage(lang) {
    if (!translations[lang]) return;
    
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    updatePageText();
    updateFlagButtons();
    document.documentElement.lang = lang;
}

function updateFlagButtons() {
    languageSwitcher.value = currentLanguage;
}

document.addEventListener('DOMContentLoaded', function() {
    loadTranslations();
});

function showNotification(type, title, message, duration = 5000) {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = type === 'error' ? '' : '✓';
    
    notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    if (duration > 0) {
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

function showError(messageKey) {
    const title = type === 'error' ? '❌ Ошибка' : '✓ Успешно';
    const message = t(`errors.${messageKey}`);
    showNotification('error', title, message);
}

function showSuccess(messageKey, replacements = {}) {
    const title = t('success.booking_title');
    let message = t(`success.${messageKey}`);
    
    Object.keys(replacements).forEach(key => {
        message = message.replace(`{${key}}`, replacements[key]);
    });
    
    showNotification('success', title, message, 8000);
}

function getErrorTitle() {
    const titles = {
        ru: '❌ Ошибка',
        ro: '❌ Eroare',
        en: '❌ Error'
    };
    return titles[currentLanguage] || titles['en'];
}

function getSuccessTitle() {
    const titles = {
        ru: '✓ Успешно',
        ro: '✓ Succes',
        en: '✓ Success'
    };
    return titles[currentLanguage] || titles['en'];
}

const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');

menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    nav.classList.toggle('active');
});

const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        nav.classList.remove('active');
    });
});

const header = document.getElementById('header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 80) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href !== '') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const headerHeight = header.offsetHeight;
                const targetPosition = target.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }
    });
});

const modal = document.getElementById('bookingModal');
const headerBookBtn = document.getElementById('headerBookBtn');
const heroBookBtn = document.getElementById('heroBookBtn');
const footerBookBtn = document.getElementById('footerBookBtn');
const modalClose = document.getElementById('modalClose');

function openBookingModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeBookingModal() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

headerBookBtn.addEventListener('click', openBookingModal);
heroBookBtn.addEventListener('click', openBookingModal);
footerBookBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openBookingModal();
});

modalClose.addEventListener('click', closeBookingModal);

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeBookingModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeBookingModal();
    }
});

const checkInInput = document.getElementById('bookingDate');
let bookedDates = [];
let bookedDatesSet = new Set();
let flatpickrInstance = null;
let bookedSlots = []; // [{ bookingDate, startTime, endTime, resourceType }, ...]


async function loadBookedDates() {
    try {
        const response = await fetch('/api/booked-dates');
        if (!response.ok) throw new Error('Failed to fetch booked dates');
        const data = await response.json();
        bookedDates = data.bookedDates;
        bookedSlots = data.bookedDates || [];
        bookedDatesSet = new Set(bookedDates.map(b => b.bookingDate));
        initializeDatePicker();
    } catch (error) {
        console.error('Error loading booked dates:', error);
    }
}

function timeToMinutes(t) {
    const parts = (t || '').split(':').map(Number);
    if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
    return parts[0] * 60 + parts[1];
}

function checkLocalTimeConstraints(resource, dateStr, startTime, endTime) {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (startMin === null || endMin === null) {
        return { ok: false, code: 'invalid_time_format' };
    }
    if (startMin >= endMin) {
        return { ok: false, code: 'invalid_time_range' };
    }
    const durationHours = (endMin - startMin) / 60;
    const minHours = resource === 'sauna' ? 4 : 2;
    if (durationHours < minHours) {
        return { ok: false, code: resource === 'sauna' ? 'min_duration_sauna' : 'min_duration_veranda' };
    }

    // conflict check with confirmed bookings for same resource and date
    for (const eb of bookedSlots) {
        if (eb.resourceType !== resource || eb.bookingDate !== dateStr) continue;
        const ebStart = timeToMinutes(eb.startTime);
        const ebEnd = timeToMinutes(eb.endTime);
        if (ebStart === null || ebEnd === null) continue;

        const gapExisting = eb.resourceType === 'sauna' ? 120 : 60;
        const gapNew = resource === 'sauna' ? 120 : 60;

        const ok1 = (ebEnd + gapExisting) <= startMin;
        const ok2 = (endMin + gapNew) <= ebStart;

        if (!(ok1 || ok2)) {
            return { ok: false, code: 'time_conflict' };
        }
    }

    return { ok: true };
}

function initializeDatePicker() {
    if (flatpickrInstance) {
        flatpickrInstance.destroy();
    }

    const todayDate = new Date();
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const disabledDates = Array.from(bookedDatesSet).map(date => new Date(date));

    flatpickrInstance = flatpickr(checkInInput, {
        locale: 'ru',
        minDate: todayDate,
        dateFormat: 'Y-m-d',
        disable: disabledDates,
        onChange: function(selectedDates, dateStr, instance) {
            checkInInput.classList.remove('booked', 'error');
            if (bookedDatesSet.has(dateStr)) {
                checkInInput.classList.add('booked', 'error');
                instance.clear();
                setTimeout(() => {
                    showNotification('error', getErrorTitle(), t('errors.date_booked'));
                }, 10);
            }
        },
        onReady: function(selectedDates, dateStr, instance) {
            instance.element.classList.add('flatpickr-input');
        }
    });
}

const bookingForm = document.getElementById('bookingForm');
const phoneInput = document.getElementById('phone');

bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    document.querySelectorAll('.form-group input, .form-group textarea').forEach(input => {
        input.classList.remove('error', 'success');
    });
    
    const formData = new FormData(bookingForm);
    const data = Object.fromEntries(formData);
    const bookingDate = new Date(data.bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (bookingDate < today) {
        showNotification('error', getErrorTitle(), t('errors.past_date'));
        document.getElementById('bookingDate').classList.add('error');
        return;
    }

    if (!data.startTime || !data.endTime || !data.resource) {
        showNotification('error', getErrorTitle(), t('errors.missing_time_or_resource'));
        return;
    }

    const timeCheck = checkLocalTimeConstraints(data.resource, data.bookingDate, data.startTime, data.endTime);
    if (!timeCheck.ok) {
        const msgKey = timeCheck.code;
        showNotification('error', getErrorTitle(), t(`errors.${msgKey}`));
        if (msgKey === 'invalid_time_range') {
            document.getElementById('startTime').classList.add('error');
            document.getElementById('endTime').classList.add('error');
        } else if (msgKey === 'time_conflict') {
            document.getElementById('startTime').classList.add('error');
            document.getElementById('endTime').classList.add('error');
            document.getElementById('bookingDate').classList.add('error');
        }
        return;
    }

    data.phone = data.phone.trim();
    const hasDigits = /\d/.test(data.phone);
    if (!hasDigits) {
        showNotification('error', getErrorTitle(), t('errors.invalid_phone'));
        phoneInput.classList.add('error');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showNotification('error', getErrorTitle(), t('errors.invalid_email'));
        document.getElementById('email').classList.add('error');
        return;
    }

    data.language = currentLanguage;
    
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: data.name,
                email: data.email,
                phone: data.phone,
                bookingDate: data.bookingDate,
                startTime: data.startTime,
                endTime: data.endTime,
                resourceType: data.resource,
                message: data.message || '',
                language: data.language
            })
        });

        if (!response.ok) {
            const error = await response.json();
            const errorMessage = error.errorCode ? t(`errors.${error.errorCode}`) : t('errors.booking_failed');
            showNotification('error', getErrorTitle(), errorMessage);
            if (error.errorCode === 'invalid_time_range' || error.errorCode === 'time_conflict' || error.errorCode === 'min_duration_sauna' || error.errorCode === 'min_duration_veranda') {
                document.getElementById('startTime').classList.add('error');
                document.getElementById('endTime').classList.add('error');
            }
            return;
        }

        let successMessage = t('success.booking_message')
            .replace('{phone}', data.phone);
        
        const dateInfo = t('success.booking_date').replace('{date}', data.bookingDate);
        successMessage = dateInfo + '\n\n' + successMessage;

        showNotification('success', t('success.booking_title'), successMessage, 8000);

        document.querySelectorAll('.form-group input, .form-group textarea').forEach(input => {
            if (input.value) input.classList.add('success');
        });

        setTimeout(() => {
            bookingForm.reset();
            closeBookingModal();
            document.querySelectorAll('.form-group input, .form-group textarea').forEach(input => {
                input.classList.remove('success');
            });
        }, 2000);
        
        loadBookedDates();
    } catch (error) {
        console.error('Booking error:', error);
        showNotification('error', getErrorTitle(), t('errors.network_error'));
    }
});

window.addEventListener('load', () => {
    loadBookedDates();
    initSwiper();
});

const images = document.querySelectorAll('img[src]');

const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
                img.src = img.dataset.src;
            }
            observer.unobserve(img);
        }
    });
}, {
    rootMargin: '50px'
});

images.forEach(img => {
    if (!img.loading) {
        img.loading = 'lazy';
    }
    imageObserver.observe(img);
});

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

const sections = document.querySelectorAll('.about, .amenities, .gallery');
sections.forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    sectionObserver.observe(section);
});

const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');

let currentImageIndex = 0;
const galleryImages = [
    {
        src: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200',
        alt: 'Территория глэмпинга'
    },
    {
        src: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200',
        alt: 'Интерьер глэмпинга'
    },
    {
        src: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200',
        alt: 'Общая зона'
    },
    {
        src: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200',
        alt: 'Природный ландшафт'
    },
    {
        src: 'https://images.unsplash.com/photo-1504851149312-7a075b496cc7?w=1200',
        alt: 'Внутреннее убранство'
    },
    {
        src: 'https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200',
        alt: 'Вечерний вид'
    }
];

function openLightbox(index) {
    currentImageIndex = index;
    updateLightbox();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function updateLightbox() {
    const image = galleryImages[currentImageIndex];
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = image.alt;
}

function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
    updateLightbox();
}

function showPrevImage() {
    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    updateLightbox();
}

document.querySelectorAll('.desktop-gallery .gallery-item').forEach((item, index) => {
    item.addEventListener('click', () => {
        openLightbox(index);
    });
});

document.querySelectorAll('.mobile-swiper .swiper-slide img').forEach((img, index) => {
    img.addEventListener('click', () => {
        openLightbox(index);
    });
});

lightboxClose.addEventListener('click', closeLightbox);
lightboxNext.addEventListener('click', showNextImage);
lightboxPrev.addEventListener('click', showPrevImage);

lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
        closeLightbox();
    }
});

document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('active')) {
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowRight') {
            showNextImage();
        } else if (e.key === 'ArrowLeft') {
            showPrevImage();
        }
    }
});

let mobileSwiper = null;

function initSwiper() {
    if (window.innerWidth <= 768) {
        if (!mobileSwiper) {
            mobileSwiper = new Swiper('.mobile-swiper', {
                slidesPerView: 1,
                spaceBetween: 10,
                loop: true,
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                autoplay: {
                    delay: 5000,
                    disableOnInteraction: false,
                },
            });
        }
    } else {
        if (mobileSwiper) {
            mobileSwiper.destroy();
            mobileSwiper = null;
        }
    }
}

window.addEventListener('load', initSwiper);
window.addEventListener('resize', initSwiper);
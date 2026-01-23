let currentLanguage = localStorage.getItem('language') || 'ru';
let translations = null;

function loadTranslations() {
    if (!window.translationsLoaded || !window.translations) {
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
}

function initializeLanguageSwitcher() {
    const langButtons = document.querySelectorAll('.lang-btn');
    
    updateFlagButtons();

    langButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = btn.getAttribute('data-lang');
            setLanguage(lang);
        });
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
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-lang="${currentLanguage}"]`);
    if (activeBtn) activeBtn.classList.add('active');
}

document.addEventListener('DOMContentLoaded', function() {
    loadTranslations();
});

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

async function loadBookedDates() {
    try {
        const response = await fetch('/api/booked-dates');
        if (!response.ok) throw new Error('Failed to fetch booked dates');
        const data = await response.json();
        bookedDates = data.bookedDates;
        bookedDatesSet = new Set(bookedDates.map(b => b.bookingDate));
        initializeDatePicker();
    } catch (error) {
        console.error('Error loading booked dates:', error);
    }
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
            checkInInput.classList.remove('booked');
            if (bookedDatesSet.has(dateStr)) {
                checkInInput.classList.add('booked');
                instance.clear();
                setTimeout(() => {
                    alert('Выбранная дата уже забронирована. Пожалуйста, выберите другую дату.');
                }, 10);
            }
        },
        onReady: function(selectedDates, dateStr, instance) {
            instance.element.classList.add('flatpickr-input');
        }
    });
}

const bookingForm = document.getElementById('bookingForm');

bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(bookingForm);
    const data = Object.fromEntries(formData);
    const bookingDate = new Date(data.bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (bookingDate < today) {
        alert('Дата посещения не может быть в прошлом');
        return;
    }

    if (bookedDatesSet.has(data.bookingDate)) {
        alert('К сожалению, выбранная дата уже забронирована. Пожалуйста, выберите другую дату.');
        return;
    }
    
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            alert('Ошибка: ' + (error.error || 'Не удалось создать бронирование'));
            return;
        }

        alert(`Спасибо за вашу заявку на бронирование!\n\nДетали:\nДата посещения: ${data.bookingDate}\nГостей: ${data.guests}\n\nМы свяжемся с вами по номеру ${data.phone} в течение 24 часов для подтверждения бронирования.`);

        bookingForm.reset();
        closeBookingModal();
        loadBookedDates();
    } catch (error) {
        console.error('Booking error:', error);
        alert('Ошибка при отправке бронирования. Пожалуйста, попробуйте позже.');
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
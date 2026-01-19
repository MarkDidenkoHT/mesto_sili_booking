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

const bookingForm = document.getElementById('bookingForm');

bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(bookingForm);
    const data = Object.fromEntries(formData);
    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkIn < today) {
        alert('Дата заезда не может быть в прошлом');
        return;
    }
    
    if (checkOut <= checkIn) {
        alert('Дата выезда должна быть позже даты заезда');
        return;
    }
    
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    alert(`Спасибо за вашу заявку на бронирование!\n\nДетали:\nЗаезд: ${data.checkIn}\nВыезд: ${data.checkOut}\nНочей: ${nights}\nГостей: ${data.guests}\n\nМы свяжемся с вами по номеру ${data.phone} в течение 24 часов для подтверждения бронирования.`);

    bookingForm.reset();
    closeBookingModal();
});

const checkInInput = document.getElementById('checkIn');
const checkOutInput = document.getElementById('checkOut');
const todayDate = new Date().toISOString().split('T')[0];
checkInInput.setAttribute('min', todayDate);

checkInInput.addEventListener('change', () => {
    const checkInDate = new Date(checkInInput.value);
    checkInDate.setDate(checkInDate.getDate() + 1);
    const minCheckOut = checkInDate.toISOString().split('T')[0];
    checkOutInput.setAttribute('min', minCheckOut);
    
    if (checkOutInput.value && new Date(checkOutInput.value) <= new Date(checkInInput.value)) {
        checkOutInput.value = '';
    }
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

fetch('/api/config')
    .then(response => {
        if (!response.ok) throw new Error('Config fetch failed');
        return response.json();
    })
    .then(config => {
        if (config.weglotApiKey) {
            if (typeof window.Weglot !== 'undefined') {
                Weglot.initialize({
                    api_key: config.weglotApiKey
                });
                
                setTimeout(() => {
                    const weglotUI = document.querySelector('.wg-drop');
                    
                    if (weglotUI) {
                        const container = document.querySelector('.weglot-container');
                        if (container) {
                            container.appendChild(weglotUI);
                        }
                    }
                }, 1000);
            } else {
                console.error('Weglot library not loaded');
            }
        } else {
            console.warn('No API Key provided');
        }
    })
    .catch(error => {
        console.error('Config loading error:', error);
    });
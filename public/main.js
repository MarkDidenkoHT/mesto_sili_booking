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
    
    if (currentScroll > 100) {
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
        alert('Check-in date cannot be in the past');
        return;
    }
    
    if (checkOut <= checkIn) {
        alert('Check-out date must be after check-in date');
        return;
    }
    
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    alert(`Thank you for your reservation request!\n\nDetails:\nCheck-in: ${data.checkIn}\nCheck-out: ${data.checkOut}\nNights: ${nights}\nGuests: ${data.guests}\n\nWe will contact you at ${data.email} within 24 hours to confirm your booking.`);

    bookingForm.reset();
    closeBookingModal();
    console.log('Booking data:', data);
});

const checkInInput = document.getElementById('checkIn');
const checkOutInput = document.getElementById('checkOut');
const today = new Date().toISOString().split('T')[0];
checkInInput.setAttribute('min', today);

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
            img.src = img.src;
            observer.unobserve(img);
        }
    });
}, {
    rootMargin: '50px'
});

images.forEach(img => {
    imageObserver.observe(img);
});

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
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
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    sectionObserver.observe(section);
});

fetch('/api/config')
    .then(response => {
        if (!response.ok) throw new Error('Config fetch failed');
        return response.json();
    })
    .then(config => {
        if (config.weglotApiKey && typeof window.Weglot !== 'undefined') {
            Weglot.initialize({
                api_key: config.weglotApiKey
            });
        }
    })
    .catch(error => console.error('Config loading error:', error));
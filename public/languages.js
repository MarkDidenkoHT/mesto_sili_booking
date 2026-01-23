let currentLanguage = localStorage.getItem('language') || 'ru';
let translations = {};

async function loadTranslations() {
    try {
        const response = await fetch('/translations.json');
        if (!response.ok) {
            throw new Error(`Failed to load translations: ${response.status}`);
        }
        translations = await response.json();
        console.log('[i18n] Translations loaded successfully');
        updatePageText();
        initializeLanguageSwitcher();
    } catch (error) {
        console.error('[i18n] Error loading translations:', error);
    }
}

function t(key) {
    const keys = key.split('.');
    let value = translations[currentLanguage];
    
    for (const k of keys) {
        if (value && typeof value === 'object') {
            value = value[k];
        } else {
            console.warn(`[i18n] Missing translation key: ${key}`);
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
        } else if (element.tagName === 'INPUT' && element.type === 'checkbox') {
            // Skip checkboxes, they don't have text content
        } else {
            element.textContent = translatedText;
        }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });

    // Update HTML content (for footer copyright)
    document.querySelectorAll('[data-i18n-html]').forEach(element => {
        const key = element.getAttribute('data-i18n-html');
        element.innerHTML = t(key);
    });
}

function initializeLanguageSwitcher() {
    const langButtons = document.querySelectorAll('.lang-btn');
    
    if (langButtons.length === 0) {
        console.warn('[i18n] Language switcher buttons not found');
        return;
    }

    updateFlagButtons();

    langButtons.forEach(btn => {
        btn.addEventListener('click', handleLanguageChange);
    });
}

function handleLanguageChange(e) {
    e.preventDefault();
    const lang = this.getAttribute('data-lang');
    setLanguage(lang);
}

function setLanguage(lang) {
    if (!translations[lang]) {
        console.warn(`[i18n] Language not available: ${lang}`);
        return;
    }

    currentLanguage = lang;
    localStorage.setItem('language', lang);
    console.log(`[i18n] Language changed to: ${lang}`);
    
    updatePageText();
    updateFlagButtons();
    
    // Update HTML lang attribute
    document.documentElement.lang = lang;
}

function updateFlagButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-lang="${currentLanguage}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTranslations);
} else {
    loadTranslations();
}

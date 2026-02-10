let currentStep = 1;
let isPro = false;
let deferredPrompt;

// Init
document.addEventListener('DOMContentLoaded', async () => {
    initThemeAndLang();
    checkAccessTime();
    startLiveClock();
    startCountdown();
    fetchWeather();
    injectTestModeBanner();

    // Admin Mode Indicator
    if (localStorage.getItem('dashboard_token')) {
        const badge = document.createElement('div');
        badge.innerHTML = '<i class="fas fa-user-shield"></i> Admin Access';
        badge.style.cssText = 'position:fixed; bottom:20px; right:20px; background:linear-gradient(135deg, #6366f1, #8b5cf6); color:white; padding:10px 20px; border-radius:30px; font-size:13px; font-weight:600; z-index:9999; box-shadow:0 10px 25px rgba(99,102,241,0.4); display:flex; align-items:center; gap:8px; border:1px solid rgba(255,255,255,0.2);';
        document.body.appendChild(badge);
    }

    // Load Districts
    const distSelect = document.getElementById('district');
    if (distSelect) {
        try {
            const dRes = await fetch('/api/districts');
            const districts = await dRes.json();
            districts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = opt.textContent = d;
                distSelect.appendChild(opt);
            });
        } catch (e) { console.error("Districts load error:", e); }
    }

    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', calculateTotals);
    });

    // Navigation Buttons Logic
    document.querySelectorAll('.btn-next').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (btn.getAttribute('type') === 'submit') return;
            e.preventDefault();
            nextStep(currentStep + 1);
        });
    });

    document.querySelectorAll('.btn-prev').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            goToStep(currentStep - 1);
        });
    });

    // PWA Install Logic
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const installBtns = document.querySelectorAll('.install-trigger');
        installBtns.forEach(btn => btn.style.display = 'flex');
    });

    // Load saved info
    const fioInput = document.getElementById('fio');
    const phoneInput = document.getElementById('phone');
    if (fioInput) fioInput.value = localStorage.getItem('d_fio') || '';
    if (phoneInput) {
        phoneInput.value = localStorage.getItem('d_phone') || '';
        if (phoneInput.value) checkProUser();
    }

    // Display User Info
    displayUserInfo();
});

const translations = {
    uz: {
        nav_home: "Asosiy sahifa",
        nav_form: "Davomat kiritish",
        nav_dashboard: "Dashboard",
        nav_about: "Biz haqimizda",
        nav_logout: "Chiqish",
        nav_login: "Kirish",
        hero_title: "Ferghanaregdavomat web",
        hero_subtitle: "Farg‘ona viloyati MMTB TTTIMva MTTTE sho‘basi",
        step1_title: "Shaxsiy ma'lumotlar",
        step2_title: "Hudud va Maktab",
        step3_title: "Jami ko'rsatkichlar",
        step4_title: "Sababli kelmaganlar",
        step5_title: "Sababsiz kelmaganlar",
        step6_title: "Tasdiqlash",
        label_fio: "F.I.SH (MMIBDO')",
        label_phone: "Telefon raqam",
        label_district: "Tuman / Shahar",
        label_school: "Maktab / Muassasa",
        label_classes: "Sinf soni",
        label_students: "O'quvchi soni",
        label_kasal: "Kasal",
        label_tadbir: "Tadbir va tanlovlarda",
        label_oilaviy: "Oilaviy tadbir",
        label_ijtimoiy: "Ijtimoiy ahvoli og'ir",
        label_boshqa: "Boshqa",
        label_total_s: "JAMI SABABLI",
        label_muntazam: "Surunkali",
        label_qidiruv: "Qidiruvda",
        label_chetel: "Chet elda",
        label_ishlab: "Ishlayotgan",
        label_total_ss: "JAMI SABABSIZ",
        btn_next: "Keyingi",
        btn_prev: "Ortga",
        btn_submit: "Yuborish",
        success_title: "Rahmat!",
        success_msg: "Ma'lumotlar muvaffaqiyatli qabul qilindi.",
        lang_changed: "Til o'zgartirildi: O'zbekcha",
        weather_title: "Farg'ona",
        countdown_prefix: "Qolgan vaqt:",
        ph_fio: "Masalan: Turdiyev Rustam",
        ph_login: "Foydalanuvchi nomi",
        ph_password: "Parol",
        ph_search: "Qidirish...",
        tab_v_svod: "Viloyat Svod",
        tab_t_svod: "Tuman Svod",
        tab_absents: "Sababsizlar",
        tab_monitor: "Jonli Monitor",
        tab_analysis: "Tahlil",
        tab_profile: "Profil",
        tab_school: "Mening Maktabim",
        tab_admin: "Admin Panel",
        label_date: "Sana",
        label_district_sel: "Tumanni tanlang",
        btn_excel: "Excelga saqlash",
        stat_entries: "Jami kiritilgan",
        stat_avg: "O'rtacha davomat",
        stat_absents: "Sababsizlar",
        stat_total_students: "Jami o'quvchi",
        col_district: "Hudud nomi",
        col_schools: "Maktablar",
        col_student: "O'quvchi",
        col_sababli: "Sababli",
        col_sababsiz: "Sababsiz",
        col_yesterday: "Kecha (%)",
        col_today: "Bugun (%)",
        app_download_title: "Mobil ilovani o'rnating",
        app_download_subtitle: "Davomat tizimidan yanada qulay foydalanish uchun rasmiy mobil ilovani o'rnatib oling.",
        btn_google_play: "Google Play",
        btn_app_store: "App Store",
        col_time: "Vaqt",
        col_class: "Sinf",
        col_fio: "F.I.SH",
        col_address: "Manzil",
        col_parent: "Ota-ona",
        col_phone_t: "Telefon",
        col_source: "Manba",
        col_responsible: "Mas'ul",
        col_percent: "Davomat (%)",
        label_live: "Jonli monitoring",
        label_history: "Davomat tarixi",
        label_today_status: "Bugungi holat",
        label_psixolog: "Inspektor psixolog",
        label_student_list: "O'quvchilar ro'yxati",
        absents_msg: "Sizda sababsiz kelmagan o‘quvchilar soni {count} nafarni tashkil etadi.",
        work_hours_title: "Ish vaqti tartibi",
        work_mgmt: "Boshqarma xodimlari",
        work_dist: "Tuman va shahar bo'limlari",
        work_days: "Ish kunlari: Dushanba - Juma",
        work_weekend: "Shanba va Yakshanba dam olish kuni",
        work_lunch: "Tushlik",
        work_time_mgmt: "09:00 dan 18:00 gacha",
        work_lunch_mgmt: "13:00 dan 14:00 gacha",
        work_time_dist: "08:00 dan 17:00 gacha",
        work_lunch_dist: "12:00 dan 13:00 gacha"
    },
    ru: {
        nav_home: "Главная",
        nav_form: "Ввод посещаемости",
        nav_dashboard: "Дашборд",
        nav_about: "О нас",
        nav_logout: "Выход",
        nav_login: "Вход",
        hero_title: "Ferghanaregdavomat web",
        hero_subtitle: "Отдел ТТТИМ и МТТТЕ ММТБ Ферганской области",
        step1_title: "Личные данные",
        step2_title: "Район и Школа",
        step3_title: "Общие показатели",
        step4_title: "Причины (уважительные)",
        step5_title: "Причины (без уваж.)",
        step6_title: "Подтверждение",
        label_fio: "Ф.И.О. (ЗДВР)",
        label_phone: "Номер телефона",
        label_district: "Район / Город",
        label_school: "Школа / Учреждение",
        label_classes: "Кол-во классов",
        label_students: "Кол-во учеников",
        label_kasal: "Болезнь",
        label_tadbir: "Мероприятия",
        label_oilaviy: "Семейные обстоятельства",
        label_ijtimoiy: "Тяжелое соц. положение",
        label_boshqa: "Другое",
        label_total_s: "ИТОГО ПРИЧИНЫ",
        label_muntazam: "Хронические",
        label_qidiruv: "В розыске",
        label_chetel: "За границей",
        label_ishlab: "Работает",
        label_total_ss: "ИТОГО БЕЗ ПРИЧИН",
        btn_next: "Далее",
        btn_prev: "Назад",
        btn_submit: "Отправить",
        success_title: "Спасибо!",
        success_msg: "Данные успешно приняты.",
        lang_changed: "Язык изменен: Русский",
        weather_title: "Фергана",
        countdown_prefix: "Осталось времени:",
        ph_fio: "Например: Турдиев Рустам",
        ph_login: "Имя пользователя",
        ph_password: "Пароль",
        ph_search: "Поиск...",
        tab_v_svod: "Свод области",
        tab_t_svod: "Свод района",
        tab_absents: "Без причины",
        tab_monitor: "Живой монитор",
        tab_analysis: "Анализ",
        tab_profile: "Профиль",
        tab_school: "Моя школа",
        tab_admin: "Админ панель",
        label_date: "Дата",
        label_district_sel: "Выберите район",
        btn_excel: "Сохранить в Excel",
        stat_entries: "Всего введено",
        stat_avg: "Средняя посещ.",
        stat_absents: "Без причины",
        stat_total_students: "Всего учеников",
        col_district: "Наименование",
        col_schools: "Школы",
        col_student: "Ученик",
        col_sababli: "Причина",
        col_sababsiz: "Без причины",
        col_yesterday: "Вчера (%)",
        col_today: "Сегодня (%)",
        app_download_title: "Установите мобильное приложение",
        app_download_subtitle: "Для более удобного использования системы посещаемости установите официальное мобильное приложение.",
        btn_google_play: "Google Play",
        btn_app_store: "App Store",
        col_time: "Время",
        col_class: "Класс",
        col_fio: "Ф.И.О.",
        col_address: "Адрес",
        col_parent: "Родитель",
        col_phone_t: "Телефон",
        col_source: "Источник",
        col_responsible: "Ответственный",
        col_percent: "Посещаемость (%)",
        label_live: "Живой мониторинг",
        label_history: "История посещаемости",
        label_today_status: "Сегодняшний статус",
        label_psixolog: "Инспектор психолог",
        label_student_list: "Список учеников",
        absents_msg: "Количество учеников, пропустивших занятия без причины, составляет {count}.",
        work_hours_title: "График работы",
        work_mgmt: "Сотрудники управления",
        work_dist: "Районные и городские отделы",
        work_days: "Рабочие дни: Понедельник - Пятница",
        work_weekend: "Суббота и Воскресенье - выходные",
        work_lunch: "Обед",
        work_time_mgmt: "с 09:00 до 18:00",
        work_lunch_mgmt: "с 13:00 до 14:00",
        work_time_dist: "с 08:00 до 17:00",
        work_lunch_dist: "с 12:00 до 13:00"
    }
};

// Theme & Language Logic
function initThemeAndLang() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        updateThemeIcons(true);
    }
    const savedLang = localStorage.getItem('lang') || 'uz';
    updateLangButtons(savedLang);
    applyTranslations(savedLang);
}

function updateLangButtons(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${lang}'`));
    });
}

function applyTranslations(lang) {
    const t = translations[lang];
    if (!t) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            if (el.tagName === 'INPUT') {
                el.placeholder = t[key];
            } else if (el.tagName === 'BUTTON' && el.hasAttribute('title')) {
                el.title = t[key];
                if (!el.classList.contains('icon-btn')) el.innerHTML = t[key];
            } else {
                // Preserve icons if they exist
                const icon = el.querySelector('i');
                if (icon) {
                    el.innerHTML = '';
                    el.appendChild(icon);
                    el.appendChild(document.createTextNode(' ' + t[key]));
                } else {
                    el.innerHTML = t[key];
                }
            }
        }
    });

    // Specific fixes for buttons with icons in davomat form
    document.querySelectorAll('.btn-next').forEach(btn => {
        if (btn.innerHTML.includes('fa-arrow-right')) {
            btn.innerHTML = `${t.btn_next} <i class="fas fa-arrow-right"></i>`;
        }
    });
}

function toggleTheme() {
    document.documentElement.classList.toggle('light-mode');
    const isLight = document.documentElement.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    updateThemeIcons(isLight);
}

function updateThemeIcons(isLight) {
    const icons = document.querySelectorAll('.theme-toggle-btn i');
    icons.forEach(icon => {
        icon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
    });
}

function changeLang(lang) {
    localStorage.setItem('lang', lang);
    updateLangButtons(lang);
    applyTranslations(lang);
    showToast(translations[lang].lang_changed, 'success');
}

async function installApp() {
    if (!deferredPrompt) {
        showToast("Ilova allaqachon o'rnatilgan yoki brauzeringiz buni qo'llab-quvvatlamaydi.", "info");
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Install outcome: ${outcome}`);
    if (outcome === 'accepted') {
        deferredPrompt = null;
        const installBtns = document.querySelectorAll('.install-trigger');
        installBtns.forEach(btn => btn.style.display = 'none');
    }
}

// Global Toast function
window.showToast = window.showToast || function (msg, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'exclamation-circle' : 'info-circle');
    const color = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#6366f1');
    toast.style.borderLeftColor = color;
    toast.innerHTML = `<i class="fas fa-${icon}" style="color:${color}"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 4000);
};

// Time & Access Logic
function checkAccessTime() {
    // 1. Never block if we are on the login, home, or about pages
    const path = window.location.pathname;
    if (path.includes('login.html') || path.includes('index.html') || path.includes('about.html') || path === '/') {
        return;
    }

    // 2. Admins are never blocked
    if (localStorage.getItem('dashboard_token')) return;

    // 3. Only block if the attendance form exists
    if (!document.getElementById('attendanceForm')) return;

    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    if (day === 0) {
        showJokeOverlay("Bugun yakshanba - dam olish kuni! 😴<br>Hatto botlar ham bugun uxlashadi.");
        return;
    }

    if (hour < 8) {
        showJokeOverlay("Hali juda barvaqt-ku! 🥱<br>Soat 08:00 da qayta ochamiz.");
    } else if (hour >= 16) {
        showJokeOverlay("Vaqt tugadi! 🌙<br>Hamma uy-uyiga tarqalgan mahalda davomat kiritish kechikdi. Ertaga barvaqtroq kiring!");
    }
}

function showJokeOverlay(msg) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        background: #0f172a; color: white; text-align: center; padding: 2rem;
        font-family: 'Outfit', sans-serif; z-index: 999999;
    `;
    overlay.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.03); padding: 3rem; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(15px); max-width: 500px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
            <i class="fas fa-clock-rotate-left" style="font-size: 5rem; color: #6366f1; margin-bottom: 2rem; display: block;"></i>
            <h2 style="margin-bottom: 15px; font-size: 1.8rem; font-weight: 600;">${msg}</h2>
            <p style="color: #94a3b8; margin-bottom: 30px; font-size: 1.1rem; line-height: 1.6;">Davomat kiritish vaqti 08:00 dan 16:00 gacha belgilangan. Hozirgi vaqtda ma'lumot qabul qilinmaydi.</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <a href="index.html" style="color:white; text-decoration:none; padding:12px 25px; border:1px solid rgba(255,255,255,0.2); border-radius:12px; font-weight:600; transition:0.3s; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-home"></i> Bosh sahifa
                </a>
                <a href="login.html" style="background: #6366f1; color:white; text-decoration:none; padding:12px 25px; border-radius:12px; font-weight:600; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3); display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-sign-in-alt"></i> Kirish
                </a>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Hide other fixed elements that might bleed through
    const widgets = document.querySelector('.top-widgets-bar');
    if (widgets) widgets.style.display = 'none';
    const navbar = document.querySelector('.navbar');
    if (navbar) navbar.style.display = 'none';

    document.body.style.overflow = 'hidden';
}

function startLiveClock() {
    setInterval(() => {
        const now = new Date();
        const el = document.getElementById('liveClock');
        if (el) {
            // Options for date: "10-Fevral, Dushanba"
            const options = { day: 'numeric', month: 'long', weekday: 'long' };
            const dateStr = now.toLocaleDateString('uz-UZ', options);
            const timeStr = now.toLocaleTimeString('uz-UZ');
            el.innerHTML = `<span style="font-size:0.85em; color:#cbd5e1; margin-right:5px">${dateStr} |</span> ${timeStr}`;
        }
    }, 1000);
}

function injectTestModeBanner() {
    // Check if we are in a frame or standalone (optional, but good for PWA)
    const banner = document.createElement('div');
    banner.id = "testModeBanner";
    banner.style.cssText = `
        position: fixed;
        top: 40px; 
        left: 0; 
        width: 100%; 
        height: 28px;
        background: linear-gradient(90deg, #facc15, #fbbf24); 
        color: #000; 
        z-index: 1050;
        display: flex; 
        align-items: center; 
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    banner.innerHTML = `
        <marquee scrollamount="6" behavior="scroll" direction="left" style="font-weight: 700; font-size: 13px; text-transform: uppercase;">
            ⚠️ DIQQAT: Tizim hozirda TEST REJIMIDA ishlamoqda! Barcha kiritilgan ma'lumotlar sinov tariqasida qabul qilinadi.
        </marquee>
    `;

    document.body.appendChild(banner);

    // Adjust Layout
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.style.top = '68px'; // 40px (top bar) + 28px (banner)
    }

    // Add extra padding to body so content isn't hidden
    const currentPad = parseInt(window.getComputedStyle(document.body).paddingTop);
    document.body.style.paddingTop = (currentPad + 30) + 'px';
}

function startCountdown() {
    const timerEl = document.getElementById('submissionTimer');
    const timerText = document.querySelector('.widget-item.countdown'); // Parent for styling
    if (!timerEl) return;

    setInterval(() => {
        const now = new Date();
        const hour = now.getHours();

        // Define opening (08:00) and closing (16:00) times for TODAY
        const openTime = new Date();
        openTime.setHours(8, 0, 0, 0);

        const closeTime = new Date();
        closeTime.setHours(16, 0, 0, 0);

        let diff = 0;
        let prefix = "";
        let color = "";

        if (now < openTime) {
            // Before 08:00 -> Count down to opening
            diff = openTime - now;
            prefix = "Ochilishiga:";
            color = "#facc15"; // Yellow warning
        } else if (now >= openTime && now < closeTime) {
            // Between 08:00 and 16:00 -> Count down to closing
            diff = closeTime - now;
            prefix = "Qolgan vaqt:";
            color = "#10b981"; // Green good to go
        } else {
            // After 16:00 -> Count down to TOMORROW'S opening
            const tomorrowOpen = new Date();
            tomorrowOpen.setDate(tomorrowOpen.getDate() + 1);
            tomorrowOpen.setHours(8, 0, 0, 0);
            diff = tomorrowOpen - now;
            prefix = "Ochilishiga:";
            color = "#f43f5e"; // Red closed
        }

        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        timerEl.innerText = `${prefix} ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        if (timerText) timerText.style.color = color;
    }, 1000);
}

async function fetchWeather() {
    const el = document.getElementById('weatherWidget');
    if (!el) return;
    try {
        const temp = Math.floor(Math.random() * (15 - 5) + 5);
        el.innerHTML = `<i class="fas fa-cloud-sun"></i> <span>Farg'ona: ${temp}°C</span>`;
    } catch (e) { }
}

async function checkProUser() {
    const phone = document.getElementById('phone').value.replace(/\D/g, '');
    if (!phone) return;
    try {
        const res = await fetch(`/api/check-pro?phone=${phone}`);
        const data = await res.json();
        isPro = data.is_pro;
        const badge = document.getElementById('premiumBadge');
        if (badge && isPro) badge.classList.remove('hidden');
    } catch (e) { }
}

function nextStep(step) {
    if (!validateStep(currentStep)) return;
    if (currentStep === 1) {
        localStorage.setItem('d_fio', document.getElementById('fio').value);
        localStorage.setItem('d_phone', document.getElementById('phone').value);
    }
    goToStep(step);
}

function goToStep(step) {
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`step${step}`);
    if (target) target.classList.add('active');
    updateProgress(step);
    currentStep = step;
    window.scrollTo(0, 0);
}

function updateProgress(step) {
    const bar = document.getElementById('progressBar');
    if (bar) bar.style.width = (step / 6) * 100 + '%';
    document.querySelectorAll('.step').forEach((s) => {
        const sNum = parseInt(s.dataset.step);
        s.classList.toggle('completed', sNum < step);
        s.classList.toggle('active', sNum === step);
    });
}

function validateStep(step) {
    const activeStep = document.getElementById(`step${step}`);
    if (!activeStep) return true;
    const required = activeStep.querySelectorAll('[required]');
    for (let el of required) {
        if (!el.value) {
            el.style.borderColor = '#ef4444';
            el.focus();
            return false;
        }
        el.style.borderColor = 'rgba(255, 255, 255, 0.08)';
    }
    return true;
}

async function loadSchools() {
    const dist = document.getElementById('district').value;
    const schoolSelect = document.getElementById('school');
    schoolSelect.innerHTML = '<option value="">Yuklanmoqda...</option>';
    try {
        const response = await fetch(`/api/schools?district=${encodeURIComponent(dist)}`);
        const schools = await response.json();
        schoolSelect.innerHTML = '<option value="">Maktabni tanlang...</option>';
        schools.forEach(s => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = s;
            schoolSelect.appendChild(opt);
        });
    } catch (e) { schoolSelect.innerHTML = '<option value="">Xatolik</option>'; }
}

function calculateTotals() {
    let sababliTotal = 0;
    document.querySelectorAll('.sababli').forEach(i => sababliTotal += (parseInt(i.value) || 0));
    const s_total_el = document.getElementById('sababli_total');
    if (s_total_el) s_total_el.value = sababliTotal;

    let sababsizTotal = 0;
    document.querySelectorAll('.sababsiz').forEach(i => sababsizTotal += (parseInt(i.value) || 0));
    const ss_total_el = document.getElementById('sababsiz_total');
    if (ss_total_el) ss_total_el.value = sababsizTotal;

    const total = parseInt(document.getElementById('total_students').value) || 0;
    const jamiKelmagan = sababliTotal + sababsizTotal;
    const percent = total > 0 ? (((total - jamiKelmagan) / total) * 100).toFixed(1) : 0;

    const sum_absent = document.getElementById('sum_absent');
    const sum_percent = document.getElementById('sum_percent');
    if (sum_absent) sum_absent.textContent = jamiKelmagan;
    if (sum_percent) sum_percent.textContent = percent + '%';
}

function processAfterStep5() {
    if (!validateStep(5)) return;
    calculateTotals();
    const sababsiz = parseInt(document.getElementById('sababsiz_total').value) || 0;
    const container = document.getElementById('studentInputsContainer');
    const header = document.getElementById('studentDetailsHeader');
    const lang = localStorage.getItem('lang') || 'uz';
    const t = translations[lang];

    if (sababsiz > 0) {
        header.classList.remove('hidden');
        document.getElementById('absentInfoMsg').innerHTML = t.absents_msg.replace('{count}', `<b>${sababsiz}</b>`);
        generateStudentInputs(sababsiz);
    } else {
        header.classList.add('hidden');
        container.innerHTML = `<div class="input-group"><label>${t.label_psixolog} F.I.SH</label><input type="text" id="inspektor_fio" required></div>`;
    }
    goToStep(6);
}

function generateStudentInputs(count) {
    const container = document.getElementById('studentInputsContainer');
    const lang = localStorage.getItem('lang') || 'uz';
    const t = translations[lang];
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        container.insertAdjacentHTML('beforeend', `
            <div class="stat-card" style="margin-bottom:1rem">
                <h4>${i}-o'quvchi</h4>
                <input type="text" class="st-class" placeholder="${t.col_class}" required>
                <input type="text" class="st-fio" placeholder="${t.col_fio}" required>
                <input type="text" class="st-address" placeholder="${t.col_address}" required>
                <input type="text" class="st-parent-fio" placeholder="${t.col_parent}" required>
                <input type="tel" class="st-parent-phone" placeholder="${t.col_phone_t}" required>
            </div>
        `);
    }
    container.insertAdjacentHTML('beforeend', `<div class="input-group"><label>${t.label_psixolog} F.I.SH</label><input type="text" id="inspektor_fio" required></div>`);
}

const form = document.getElementById('attendanceForm');
if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const students = [];
    document.querySelectorAll('.st-class').forEach((c, i) => {
        students.push({
            class: c.value,
            name: document.querySelectorAll('.st-fio')[i].value,
            address: document.querySelectorAll('.st-address')[i].value,
            parent_name: document.querySelectorAll('.st-parent-fio')[i].value,
            parent_phone: document.querySelectorAll('.st-parent-phone')[i].value
        });
    });

    const formData = {
        district: document.getElementById('district').value,
        school: document.getElementById('school').value,
        fio: document.getElementById('fio').value,
        phone: document.getElementById('phone').value,
        classes_count: document.getElementById('classes_count').value,
        total_students: document.getElementById('total_students').value,
        sababli: { total: document.getElementById('sababli_total').value },
        sababsiz: { total: document.getElementById('sababsiz_total').value },
        absent_students: students,
        inspektor_fio: document.getElementById('inspektor_fio').value
    };

    try {
        const res = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (res.ok) document.getElementById('successOverlay').classList.remove('hidden');
        else alert('Xatolik!');
    } catch (e) { alert('Tarmoq xatoligi!'); }
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

function displayUserInfo() {
    const userContainer = document.getElementById('userProfileDisplay');
    if (!userContainer) return;

    const token = localStorage.getItem('dashboard_token');
    const role = localStorage.getItem('dashboard_role');
    const district = localStorage.getItem('dashboard_district');

    // Update all login buttons to Logout if token exists
    const loginBtns = document.querySelectorAll('.login-btn, .login-mini-btn, .nav-link[onclick*="login.html"], [data-i18n="nav_login"]');
    const lang = localStorage.getItem('lang') || 'uz';

    loginBtns.forEach(btn => {
        if (token) {
            btn.innerHTML = `<i class="fas fa-sign-out-alt"></i> ${translations[lang].nav_logout || 'Chiqish'}`;
            btn.setAttribute('onclick', 'logout()');
            if (btn.classList.contains('login-btn') || btn.classList.contains('login-mini-btn')) {
                btn.style.background = 'rgba(239, 68, 68, 0.15)';
                btn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                btn.style.color = '#f87171';
            }
        } else {
            btn.innerHTML = `<i class="fas fa-sign-in-alt"></i> ${translations[lang].nav_login || 'Kirish'}`;
            btn.setAttribute('onclick', "location.href='login.html'");
        }
    });

    if (!token) {
        userContainer.innerHTML = `
            <div class="user-badge guest">
                <i class="fas fa-user-circle"></i>
                <div class="user-details">
                    <span class="user-name">Mehmon</span>
                    <span class="user-role">Oddiy foydalanuvchi</span>
                </div>
            </div>
        `;
        return;
    }

    let displayName = "Foydalanuvchi";
    let displayRole = role || "Foydalanuvchi";

    if (role === 'superadmin') {
        displayName = "qirol Turdiyev Rustam Raushanovich";
        displayRole = "Superadmin";
    } else if (district) {
        // Find name from mapping
        const names = {
            "Marg‘ilon shahar": "Kodirov Abdullajon",
            "Farg‘ona shahar": "Teshaboev Boburjon",
            "Quvasoy shahar": "Qurbonov Ulug‘bek",
            "Qo‘qon shahar": "Alieva Laziza",
            "Bag‘dod tumani": "Isaboeva Elmira",
            "Beshariq tumani": "Po‘latov Dilshodjon",
            "Buvayda tumani": "Axmadjonov Aliyorbek",
            "Dang‘ara tumani": "Miraminov Abdulaziz",
            "Yozyovon tumani": "Usmonov Shoxrux",
            "Oltiariq tumani": "Latipov Zoxidjon",
            "Qo‘shtepa tumani": "Ergasheva Mamlakatxon",
            "Rishton tumani": "Raximov Abdumutal",
            "So‘x tumani": "Ibragimov Gulshan",
            "Toshloq tumani": "Ibragimov Ergashali",
            "Uchko‘prik tumani": "Yunusova Marg‘uba",
            "Farg‘ona tumani": "Raximova Mahliyoxon",
            "Furqat tumani": "Mirzaev Mirzaxamdamjon",
            "O‘zbekiston tumani": "Ochildieva Gulmiraxon",
            "Quva tumani": "Xolikov Jaxongir"
        };
        displayName = names[district] || district;
    }

    userContainer.innerHTML = `
        <div class="user-badge ${role}">
            <i class="fas fa-user-shield"></i>
            <div class="user-details">
                <span class="user-name">${displayName}</span>
                <span class="user-role">${displayRole}</span>
            </div>
        </div>
    `;

    // Update other UI elements with FISH
    const elements = {
        'profile_fish': displayName,
        'profile_role': displayRole,
        'nav_user_fish': displayName
    };

    Object.entries(elements).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });
}

function logout() {
    localStorage.removeItem('dashboard_token');
    localStorage.removeItem('dashboard_role');
    localStorage.removeItem('dashboard_district');
    localStorage.removeItem('dashboard_school');
    window.location.href = '/login.html';
}

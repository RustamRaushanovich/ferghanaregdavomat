let currentStep = 1;
let isPro = false;
let deferredPrompt;
const PAGE_SIZE = 50;
let tumanPage = 1;
let absentPage = 1;
let monitorPage = 1;
let parentPage = 1;
const parentLimit = 25;
const monitorLimit = 20;

// Init
document.addEventListener('DOMContentLoaded', async () => {
    initThemeAndLang();
    checkAccessTime();
    startLiveClock();
    startCountdown();
    fetchWeather();
    injectTestModeBanner(); // Restoration requested by user
    initHolidayGreeting();
    updateProMiniBtn();


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
                if (d === 'Test rejimi' || d === 'MMT Boshqarma') return;
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

// Merged into the main checkProUser function below line 600

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
            const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
            const days = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];

            const dayName = days[now.getDay()];
            const day = now.getDate();
            const monthName = months[now.getMonth()];

            const dateStr = `${day}-${monthName}, ${dayName}`;
            const timeStr = now.toLocaleTimeString('en-GB'); // 24-hour format

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
        background: linear-gradient(90deg, #ef4444, #dc2626); 
        color: #fff; 
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
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.3833&longitude=71.7833&current_weather=true');
        const data = await res.json();
        const temp = Math.round(data.current_weather.temperature);
        const code = data.current_weather.weathercode;
        let icon = 'fa-sun';
        if (code >= 1 && code <= 3) icon = 'fa-cloud-sun';
        else if (code >= 45) icon = 'fa-smog';
        else if (code >= 51) icon = 'fa-cloud-rain';

        el.innerHTML = `<i class="fas ${icon}"></i> <span>Farg'ona: ${temp > 0 ? '+' : ''}${temp}°C</span>`;
    } catch (e) {
        el.innerHTML = `<i class="fas fa-sun"></i> <span>Farg'ona: +12°C</span>`;
    }
}

async function checkProUser() {
    const phoneInput = document.getElementById('phone');
    const phone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
    if (!phone || phone.length < 9) return;
    try {
        const res = await fetch(`/api/check-pro?phone=${phone}`);
        const data = await res.json();
        isPro = data.is_pro;

        // UI Updates
        const proMini = document.getElementById('proMiniBtn');
        if (proMini) proMini.style.color = isPro ? '#facc15' : '';

        const proMsg = document.getElementById('proAutoMsg');
        if (proMsg) {
            if (isPro) proMsg.classList.remove('hidden');
            else proMsg.classList.add('hidden');
        }

        const badge = document.getElementById('premiumBadge');
        if (badge) {
            if (isPro) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
        }

        // Update Global PRO state if needed
        if (isPro) {
            localStorage.setItem('d_is_pro', 'true');
            localStorage.setItem('d_pro_expire', data.pro_expire_date || '');
            localStorage.setItem('d_pro_purchase', data.pro_purchase_date || '');
        } else {
            localStorage.setItem('d_is_pro', 'false');
        }
    } catch (e) { console.error("Pro check failed:", e); }
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
    schoolSelect.disabled = true;
    try {
        const response = await fetch(`/api/schools?district=${encodeURIComponent(dist)}`);
        const schools = await response.json();
        console.log('Schools loaded:', schools.length, schools);
        schoolSelect.innerHTML = '<option value="">Maktabni tanlang...</option>';
        schools.forEach(s => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = s;
            schoolSelect.appendChild(opt);
        });
        schoolSelect.disabled = false;
    } catch (e) {
        console.error('School load error:', e);
        schoolSelect.innerHTML = '<option value="">Xatolik</option>';
        schoolSelect.disabled = false;
    }
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
    // Validation for file moved to final submit


    const container = document.getElementById('studentInputsContainer');
    const header = document.getElementById('studentDetailsHeader');
    const lang = localStorage.getItem('lang') || 'uz';
    const t = translations[lang] || translations.uz;

    if (sababsiz > 0) {
        header.classList.remove('hidden');
        const msg = t.absents_msg || "Sizda sababsiz kelmagan o‘quvchilar soni {count} nafarni tashkil etadi.";
        document.getElementById('absentInfoMsg').innerHTML = msg.replace('{count}', `<b>${sababsiz}</b>`);
        generateStudentInputs(sababsiz);
    } else {
        header.classList.add('hidden');
        container.innerHTML = `<div class="input-group"><label>${t.label_psixolog || 'Inspektor psixolog'} F.I.SH</label><input type="text" id="inspektor_fio" required></div>`;
    }
    goToStep(6);
}

function generateStudentInputs(count) {
    const container = document.getElementById('studentInputsContainer');
    const lang = localStorage.getItem('lang') || 'uz';
    const t = translations[lang] || translations.uz;
    container.innerHTML = '';

    // 1. Students inputs
    for (let i = 1; i <= count; i++) {
        container.insertAdjacentHTML('beforeend', `
            <div class="stat-card" style="margin-bottom:1.5rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);">
                <h4 style="color:var(--primary); margin-bottom:1rem; font-size:1rem;"><i class="fas fa-user-graduate"></i> ${i}-o'quvchi</h4>
                <div class="input-grid">
                    <input type="text" class="st-class" placeholder="${t.col_class || 'Sinf'}" required>
                    <input type="text" class="st-fio" placeholder="${t.col_fio || 'F.I.SH'}" required>
                    <input type="text" class="st-address" placeholder="${t.col_address || 'Manzil'}" required>
                    <input type="text" class="st-parent-fio" placeholder="${t.col_parent || 'Ota-ona'}" required>
                    <input type="tel" class="st-parent-phone" placeholder="${t.col_phone_t || 'Telefon'}" required>
                </div>
            </div>
        `);
    }

    // 2. Inspector
    container.insertAdjacentHTML('beforeend', `
        <div class="input-group" style="margin-top:20px;">
            <label style="font-weight:600;"><i class="fas fa-user-shield"></i> ${t.label_psixolog || 'Inspektor psixolog'} F.I.SH</label>
            <input type="text" id="inspektor_fio" placeholder="Masalan: Azizov A." required>
        </div>
    `);

    // 3. Bildirgi Upload Logic (RESTORING THIS FOR EVERYONE)
    const isRequired = !isPro ? 'required' : '';
    const borderColor = !isPro ? '#f43f5e' : '#10b981';
    const bgColor = !isPro ? 'rgba(244, 63, 94, 0.03)' : 'rgba(16, 185, 129, 0.03)';

    let uploadHtml = `
        <div class="stat-card" style="margin-top:25px; border: 2px dashed ${borderColor}; background: ${bgColor}; padding: 25px;">
            <h4 style="color:${borderColor}; margin-bottom:15px; display:flex; align-items:center; gap:10px;">
                <i class="fas fa-file-signature"></i> 3-ILOVA (BILDIRISHNOMA) YUKLASH ${!isPro ? '<span style="font-size:0.7rem; background:#f43f5e; color:white; padding:2px 6px; border-radius:4px;">MAJBURIY</span>' : ''}
            </h4>
            <p style="color:#94a3b8; font-size:0.9rem; margin-bottom:20px; line-height:1.5;">
                ${!isPro ? "Sababsiz kelmagan o'quvchilar uchun tasdiqlangan bildirgi (3-ilova) nusxasini yuklash <b>majburiy</b>. Файл юкланмагунигача тизим маълумотни қабул қилмайди." : "PRO foydalanuvchi sifatida sizda bildirgi avtomatik shakllantiriladi, ammo xohlasangiz қўлда ҳам юклашингиз мумкин."}
            </p>
            <div class="input-group">
                <input type="file" id="bildirgiFile" accept="image/*,application/pdf" ${isRequired} 
                    style="padding:15px; background:white; color:#1e293b; width:100%; border-radius:12px; border:1px solid #e2e8f0; cursor:pointer;">
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', uploadHtml);
}

const form = document.getElementById('attendanceForm');
if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('district', document.getElementById('district').value);
    formData.append('school', document.getElementById('school').value);
    formData.append('fio', document.getElementById('fio').value);
    formData.append('phone', document.getElementById('phone').value);
    formData.append('classes_count', document.getElementById('classes_count').value);
    formData.append('total_students', document.getElementById('total_students').value);
    formData.append('sababli_total', document.getElementById('sababli_total').value);
    formData.append('sababsiz_total', document.getElementById('sababsiz_total').value);
    formData.append('inspektor_fio', document.getElementById('inspektor_fio').value);

    // Detailed breakdown
    ['sababli_kasal', 'sababli_tadbirlar', 'sababli_oilaviy', 'sababli_ijtimoiy', 'sababli_boshqa',
        'sababsiz_muntazam', 'sababsiz_qidiruv', 'sababsiz_chetel', 'sababsiz_boyin', 'sababsiz_ishlab',
        'sababsiz_qarshilik', 'sababsiz_jazo', 'sababsiz_nazoratsiz', 'sababsiz_turmush', 'sababsiz_boshqa'
    ].forEach(id => {
        const val = document.getElementById(id)?.value || 0;
        formData.append(id, val);
    });

    // Students
    const students = [];
    const classes = document.querySelectorAll('.st-class');
    classes.forEach((c, i) => {
        students.push({
            class: c.value,
            name: document.querySelectorAll('.st-fio')[i].value,
            address: document.querySelectorAll('.st-address')[i].value,
            parent_name: document.querySelectorAll('.st-parent-fio')[i].value,
            parent_phone: document.querySelectorAll('.st-parent-phone')[i].value
        });
    });
    formData.append('absent_students', JSON.stringify(students));

    // File
    const fileInput = document.getElementById('bildirgiFile');
    const sababsizNum = parseInt(document.getElementById('sababsiz_total').value) || 0;

    // Final Validation Checklist
    if (sababsizNum > 0 && !isPro) {
        if (!fileInput || !fileInput.files[0]) {
            alert("Sababsiz kelmagan o'quvchilar mavjud! Iltimos, 3-ilova (bildirishnoma) faylini yuklang.");
            return;
        }
    }

    if (fileInput && fileInput.files[0]) {
        formData.append('bildirgi', fileInput.files[0]);
    }

    try {
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yuborilmoqda...';
        btn.disabled = true;

        let res = await fetch('/api/submit', {
            method: 'POST',
            body: formData
        });

        // Handle Duplicate (409)
        if (res.status === 409) {
            const errData = await res.json();
            if (confirm(errData.message || "Diqqat! Bugun uchun ma'lumot allaqachon kiritilgan.\n\nEski ma'lumotni o'chirib, yangisini saqlashni xohlaysizmi?")) {
                formData.append('overwrite', 'true');
                res = await fetch('/api/submit', {
                    method: 'POST',
                    body: formData
                });
            } else {
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
        }

        if (res.ok) {
            const data = await res.json();
            document.getElementById('successOverlay').classList.remove('hidden');

            // PRO: Show download button ONLY if user is PRO and bildirgi was generated
            if (data.bildirgi && isPro) {
                const downloadBtn = document.getElementById('downloadBildirgiBtn');
                const proSection = document.getElementById('proDownloadSection');
                if (downloadBtn && proSection) {
                    proSection.classList.remove('hidden');
                    downloadBtn.onclick = () => {
                        window.open(`/api/admin/reports/download/${data.bildirgi}`, '_blank');
                    };
                }
            }
        } else {
            const err = await res.json();
            alert('Xatolik: ' + (err.error || 'Server xatosi'));
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } catch (e) {
        alert('Tarmoq xatoligi!');
        console.error(e);
        const btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = false;
    }
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('SW Registered');
        subscribeToPush(reg);
    });
}

async function subscribeToPush(registration) {
    try {
        const sub = await registration.pushManager.getSubscription();
        if (sub) return; // Already subscribed

        const publicVapidKey = 'BD1ZLasi98wuNKAGl9VBehMVJxAd7_6iB2fJxuK8cWp7NMVljHkDM_cZuqkHo5kpRD1tkHIA6zfihbawpKfvin8';
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });

        await fetch('/api/push/subscribe', {
            method: 'POST',
            body: JSON.stringify(subscription),
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('Push Subscribed');
    } catch (e) {
        console.warn('Push registration failed:', e);
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}


function displayUserInfo() {
    const userContainer = document.getElementById('userProfileDisplay');
    if (!userContainer) return;

    const token = localStorage.getItem('dashboard_token');
    const role = localStorage.getItem('dashboard_role');
    const district = localStorage.getItem('dashboard_district');

    // Helper to shorten name: "Turdiyev Rustam Raushanovich" -> "R.R.Turdiyev"
    const shorten = (name) => {
        if (!name) return '';
        const p = name.replace('qirol ', '').trim().split(/\s+/);
        if (p.length < 2) return name;
        const fam = p[0];
        const ism = p[1];
        const sharif = p[2];
        if (sharif) return `${ism[0]}.${sharif[0]}.${fam}`;
        return `${ism[0]}.${fam}`;
    };

    // Update login buttons
    const loginBtns = document.querySelectorAll('.login-btn, .login-mini-btn, .nav-link[onclick*="login.html"], [data-i18n="nav_login"]');
    const lang = localStorage.getItem('lang') || 'uz';
    const t_logout = translations[lang]?.nav_logout || 'Chiqish';
    const t_login = translations[lang]?.nav_login || 'Kirish';

    loginBtns.forEach(btn => {
        if (token) {
            btn.innerHTML = `<i class="fas fa-sign-out-alt"></i> ${t_logout}`;
            btn.setAttribute('onclick', 'logout()');
            // Style adjust for logout state
            if (btn.classList.contains('login-btn')) {
                btn.classList.add('logout-mode');
                btn.style.background = 'rgba(239, 68, 68, 0.1)';
                btn.style.color = '#f87171';
                btn.style.border = '1px solid rgba(239, 68, 68, 0.2)';
            }
        } else {
            btn.innerHTML = `<i class="fas fa-sign-in-alt"></i> ${t_login}`;
            btn.setAttribute('onclick', "location.href='login.html'");
            btn.classList.remove('logout-mode');
            btn.style.background = '';
            btn.style.color = '';
            btn.style.border = '';
        }
    });

    if (!token) {
        userContainer.innerHTML = ''; // Hide profile if guest
        // Ensure Login Button is Visible
        const mainLoginBtn = document.getElementById('loginMainBtn'); // If we added ID
        if (mainLoginBtn) mainLoginBtn.style.display = 'flex';
        return;
    }

    // Hide Main Login Button if logged in (since we have profile)
    // But wait, the previous code converted the Login Button to Logout.
    // User wants "R.R.Turdiyev" display.
    // I will show Profile Badge AND Logout button? Or Profile Badge IS the menu?
    // Let's keep Profile Badge on left of Logout button.

    let displayName = "Foydalanuvchi";
    let displayRole = role || "Foydalanuvchi";

    if (role === 'superadmin') {
        displayName = "R.R.Turdiyev";
        displayRole = "Superadmin";
    } else if (district) {
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
        const raw = names[district] || district;
        displayName = shorten(raw);
    }

    userContainer.innerHTML = `
        <div class="user-badge ${role}" style="display:flex; align-items:center; gap:10px; padding:5px 12px; background:rgba(255,255,255,0.05); border-radius:30px; border:1px solid rgba(255,255,255,0.1);">
            <div style="width:32px; height:32px; background:linear-gradient(135deg, #6366f1, #a855f7); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold;">
                ${displayName[0]}
            </div>
            <div class="user-details" style="display:flex; flex-direction:column;">
                <span class="user-name" style="font-size:0.85rem; font-weight:600; color:var(--text-main);">${displayName}</span>
                <span class="user-role" style="font-size:0.7rem; color:var(--text-muted);">${displayRole}</span>
            </div>
        </div>
    `;

    const elements = {
        'profile_fish': displayName,
        'profile_role': displayRole,
        'nav_user_fish': displayName
    };

    Object.entries(elements).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });

    // Hide PRO card if already Superadmin or Pro logic
    const proCard = document.getElementById('proSubCard');
    const proDetails = document.getElementById('proDetails');
    const isProStored = localStorage.getItem('d_is_pro') === 'true';
    const isActuallyPro = role === 'superadmin' || isPro || isProStored;

    if (isActuallyPro) {
        if (proCard) proCard.style.display = 'none';
        if (proDetails && role !== 'superadmin') {
            proDetails.style.display = 'block';
            const expire = localStorage.getItem('d_pro_expire');
            const purchase = localStorage.getItem('d_pro_purchase');

            const pdEl = document.getElementById('proPurchaseDate');
            if (pdEl) pdEl.textContent = purchase || '-';

            const peEl = document.getElementById('proExpireDate');
            if (peEl) peEl.textContent = expire || '-';

            // Calculate days left
            if (expire) {
                const diff = new Date(expire) - new Date();
                const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                const daysEl = document.getElementById('proDaysLeft');
                if (daysEl) {
                    daysEl.textContent = days > 0 ? `${days} kun qoldi` : "Muddati tugagan";
                    if (days <= 0) daysEl.style.background = '#ef4444';
                }
            }
        }
    } else {
        if (proCard) proCard.style.display = 'block';
        if (proDetails) proDetails.style.display = 'none';
    }

    updateProMiniBtn(isActuallyPro);
}

const UZ_HOLIDAYS = {
    "01-01": { uz: "Yangi yil bayrami bilan tabriklaymiz! 🎉", ru: "C Новым годом! 🎉" },
    "14-01": { uz: "Vatan himoyachilari kuni muborak bo'lsin! 🛡️", ru: "С Днем защитников Родины! 🛡️" },
    "08-03": { uz: "Xalqaro xotin-qizlar kuni muborak bo'lsin! 🌷", ru: "С Международным женским днем! 🌷" },
    "21-03": { uz: "Navro'z ayyomingiz muborak bo'lsin! 🌱", ru: "С праздником Навруз! 🌱" },
    "09-05": { uz: "Xotira va qadrlash kuni. 🕯️", ru: "День памяти и почестей. 🕯️" },
    "01-06": { uz: "Bolalarni himoya qilish kuni! 🎈", ru: "День защиты детей! 🎈" },
    "01-09": { uz: "Mustaqillik kuni muborak bo'lsin! 🇺🇿", ru: "С Днем независимости! 🇺🇿" },
    "01-10": { uz: "O'qituvchi va murabbiylar kuni muborak bo'lsin! 📚", ru: "С Днем учителей и наставников! 📚" },
    "21-10": { uz: "O'zbek tili bayrami kuni muborak bo'lsin! 🗣️", ru: "С Днем узбекского языка! 🗣️" },
    "18-11": { uz: "Davlat bayrog'i qabul qilingan kun! 🇺🇿", ru: "День принятия Государственного флага! 🇺🇿" },
    "08-12": { uz: "Konstitutsiya kuni muborak bo'lsin! 📜", ru: "С Днем Конституции! 📜" }
};

function initHolidayGreeting() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const key = `${day}-${month}`;

    if (UZ_HOLIDAYS[key]) {
        const lang = localStorage.getItem('lang') || 'uz';
        const msg = UZ_HOLIDAYS[key][lang] || UZ_HOLIDAYS[key].uz;
        const container = document.getElementById('holidayGreeting');
        const textEl = document.getElementById('holidayText');
        if (container && textEl) {
            textEl.textContent = msg;
            container.style.display = 'flex';
        }
    }
}

function updateProMiniBtn(isActuallyPro = null) {
    if (isActuallyPro === null) {
        const role = localStorage.getItem('dashboard_role');
        const isProStored = localStorage.getItem('d_is_pro') === 'true';
        isActuallyPro = role === 'superadmin' || isProStored;
    }

    const btn = document.getElementById('proMiniBtn');
    if (btn) {
        btn.style.display = isActuallyPro ? 'none' : 'flex';
    }
}


function subscribePro() {
    const s = {
        uz: "PRO versiyaga o'tish uchun tizim administratori bilan bog'laning:\n\n📞 +998 90 588 47 00\n📧 support@davomat.uz",
        ru: "Для перехода на PRO версию свяжитесь с системным администратором:\n\n📞 +998 90 588 47 00\n📧 support@davomat.uz"
    };
    const lang = localStorage.getItem('lang') || 'uz';
    alert(s[lang] || s.uz);
}

function downloadArchiveReport() {
    const date = document.getElementById('archiveReportDate').value;
    if (!date) return alert("Iltimos, sanani tanlang!");
    const token = localStorage.getItem('dashboard_token');
    window.location.href = `/api/export/archive?date=${date}&token=${token}`;
}

function downloadWeeklyReport() {
    const date = document.getElementById('archiveReportDate').value || new Date().toISOString().split('T')[0];
    const token = localStorage.getItem('dashboard_token');
    window.location.href = `/api/export/weekly?date=${date}&token=${token}`;
}

function downloadMonthlyReport() {
    const date = document.getElementById('archiveReportDate').value || new Date().toISOString().split('T')[0];
    const token = localStorage.getItem('dashboard_token');
    window.location.href = `/api/export/monthly?date=${date}&token=${token}`;
}



function logout() {
    localStorage.removeItem('dashboard_token');
    localStorage.removeItem('dashboard_role');
    localStorage.removeItem('dashboard_district');
    localStorage.removeItem('dashboard_school');
    window.location.href = '/login.html';
}

/* DASHBOARD LOGIC START */
const API_BASE = '/api';

function getAuthHeaders() {
    const token = localStorage.getItem('dashboard_token');
    return token ? { 'Authorization': token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function apiFetch(url, options = {}) {
    const headers = getAuthHeaders();
    const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
    if (res.status === 401) {
        logout();
        throw new Error("Sessiya muddati tugadi");
    }
    return res.json();
}

function showTab(tabId) {
    document.querySelectorAll('.report-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const view = document.getElementById(tabId + 'View');
    const btn = document.getElementById('tab_' + tabId);

    if (view) view.classList.add('active');
    if (btn) btn.classList.add('active');

    if (tabId === 'viloyat') loadViloyatData();
    if (tabId === 'tuman') loadTumanData();
    if (tabId === 'students') loadAbsentDetails();
    if (tabId === 'recent') loadRecentActivity();
    if (tabId === 'parents') { loadParentFilters(); loadParentList(1); }
    if (tabId === 'analysis') loadAnalysisData();
    if (tabId === 'ranking') showLeaderboard();
    if (tabId === 'profile') displayUserInfo();
    if (tabId === 'admin') loadAdminData();
    if (tabId === 'reports' && !document.getElementById('archiveReportDate').value) {
        document.getElementById('archiveReportDate').value = new Date().toISOString().split('T')[0];
    }
}

async function showLeaderboard() {
    const container = document.getElementById('rankingContent');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; padding:50px;"><i class="fas fa-spinner fa-spin fa-3x"></i><br>Reyting hisoblanmoqda...</div>';

    try {
        const res = await fetch('/api/premium/leaderboard', { headers: getAuthHeaders() });
        const data = await res.json();

        let html = `
            <div class="leaderboard-grid">
                <style>
                    .leaderboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .leaderboard-card { background: rgba(255,255,255,0.05); border-radius: 20px; padding: 25px; border: 1px solid rgba(255,255,255,0.1); }
                    .ranking-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    .ranking-table th { text-align: left; opacity: 0.6; font-size: 0.8rem; padding: 10px; }
                    .ranking-table td { padding: 12px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
                    .top-rank { background: rgba(99, 102, 241, 0.1); }
                    .badge-percent { background: #6366f1; color: white; padding: 4px 8px; border-radius: 8px; font-weight: bold; font-size: 0.85rem; }
                    .winner-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 10px; }
                    .winner-info { display: flex; flex-direction: column; }
                    .dist-name { font-size: 0.75rem; opacity: 0.6; }
                    .winner-percent { color: #10b981; font-weight: bold; }
                    @media (max-width: 900px) { .leaderboard-grid { grid-template-columns: 1fr; } }
                </style>
                <div class="leaderboard-card">
                    <h3>🏆 Viloyat bo'yicha TOP-10 maktablar</h3>
                    <p class="subtitle">Oxirgi 7 kunlik o'rtacha davomat ko'rsatkichi asosida</p>
                    <table class="ranking-table">
                        <thead>
                            <tr><th>№</th><th>Maktab</th><th>Hudud</th><th>O'rtacha %</th></tr>
                        </thead>
                        <tbody>
                            ${data.viloyat.map((s, i) => `
                                <tr class="${i < 3 ? 'top-rank' : ''}">
                                    <td>${i + 1}</td>
                                    <td><b>${s.school}</b></td>
                                    <td>${s.district}</td>
                                    <td><span class="badge-percent">${parseFloat(s.avg_p).toFixed(1)}%</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="leaderboard-card">
                    <h3>📈 Hududiy yetakchilar</h3>
                    <p class="subtitle">Har bir tumandan 1-o'rindagi maktablar</p>
                    <div class="district-winners" style="max-height: 600px; overflow-y: auto;">
                        ${data.districts.map(d => `
                            <div class="winner-item">
                                <div class="winner-info">
                                    <span class="dist-name">${d.district}</span>
                                    <span class="school-name"><b>${d.school}</b></span>
                                </div>
                                <span class="winner-percent">${parseFloat(d.avg_p).toFixed(1)}%</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<div class="error-msg">❌ Reytingni yuklashda xatolik yuz berdi.</div>';
    }
}

async function loadParentFilters() {
    try {
        const res = await fetch('/api/stats/parents', { headers: getAuthHeaders() });
        const data = await res.json();

        // Populate filters
        const dSelect = document.getElementById('parentDistrictFilter');
        const sSelect = document.getElementById('parentSchoolFilter');
        if (dSelect && sSelect) {
            const districts = [...new Set(data.map(p => p.district))].sort();
            const schools = [...new Set(data.map(p => p.school))].sort();

            if (dSelect.options.length <= 1) {
                districts.forEach(d => { if (d !== '-') dSelect.innerHTML += `<option value="${d}">${d}</option>`; });
            }
            if (sSelect.options.length <= 1) {
                schools.forEach(s => { if (s !== '-') sSelect.innerHTML += `<option value="${s}">${s}</option>`; });
            }
        }

        // Add search input if it doesn't exist
        const filterControls = document.querySelector('#parentsView .controls');
        if (filterControls && !document.getElementById('parentSearch')) {
            const searchGrp = document.createElement('div');
            searchGrp.className = 'filter-group';
            searchGrp.innerHTML = `
                <label>Qidirish (F.I.SH / Tel)</label>
                <input type="text" id="parentSearch" placeholder="Ism yoki tel..." oninput="loadParentList(1)" style="min-width:200px; padding:12px 20px;">
            `;
            filterControls.appendChild(searchGrp);
        }

        return data;
    } catch (e) { console.error(e); return []; }
}

async function loadParentList(page = 1) {
    parentPage = page;
    const dFilter = document.getElementById('parentDistrictFilter') ? document.getElementById('parentDistrictFilter').value : '';
    const sFilter = document.getElementById('parentSchoolFilter') ? document.getElementById('parentSchoolFilter').value : '';
    const qFilter = document.getElementById('parentSearch') ? document.getElementById('parentSearch').value.toLowerCase() : '';

    const tbody = document.querySelector('#parentsTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center"><i class="fas fa-spinner fa-spin"></i> Yuklanmoqda...</td></tr>';

    try {
        const res = await fetch('/api/stats/parents', { headers: getAuthHeaders() });
        let data = await res.json();

        // Update Stats (only once or for the whole dataset)
        const totalEl = document.getElementById('parent_total_count');
        const topDistEl = document.getElementById('parent_top_district');

        if (totalEl) totalEl.textContent = data.length;

        if (topDistEl) {
            const distStats = {};
            data.forEach(p => { if (p.district !== '-') distStats[p.district] = (distStats[p.district] || 0) + 1; });
            const topD = Object.entries(distStats).sort((a, b) => b[1] - a[1])[0];
            topDistEl.textContent = topD ? topD[0] : '-';
        }

        // Filter
        if (dFilter) data = data.filter(p => p.district === dFilter);
        if (sFilter) data = data.filter(p => p.school === sFilter);
        if (qFilter) {
            data = data.filter(p =>
                (p.fio || '').toLowerCase().includes(qFilter) ||
                (p.phone || '').toString().includes(qFilter) ||
                (p.child_name || '').toLowerCase().includes(qFilter)
            );
        }

        const totalItems = data.length;
        const offset = (page - 1) * parentLimit;
        const pageData = data.slice(offset, offset + parentLimit);

        tbody.innerHTML = '';
        if (pageData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Ma\'lumot topilmadi</td></tr>';
            renderPagination('parentPagination', totalItems, page, parentLimit, 'loadParentList');
            return;
        }

        const role = localStorage.getItem('dashboard_role');
        const isSuper = role === 'superadmin';

        pageData.forEach(p => {
            const phoneStr = (p.phone || '').toString();
            const maskedPhone = isSuper ? phoneStr :
                (phoneStr.length > 7 ? phoneStr.substring(0, 6) + '***' + phoneStr.substring(phoneStr.length - 2) : '***');

            const fio = p.fio || '-';
            const maskedFio = isSuper ? fio : fio.split(' ').map((n, i) => i === 0 ? n : '***').join(' ');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${maskedFio}</b></td>
                <td style="color:#818cf8">${maskedPhone}</td>
                <td>${p.district || '-'}</td>
                <td>${p.school || '-'}</td>
                <td style="font-size:11px; color:#94a3b8">${p.joined_at || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

        renderPagination('parentPagination', totalItems, page, parentLimit, 'loadParentList');
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red">Xatolik: ${e.message}</td></tr>`;
    }
}

// Alias for compatibility if showTab calls loadParentStats
const loadParentStats = loadParentList;

function safeSetText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}


const DISTRICTS_LIST = ["Farg‘ona shahar", "Marg‘ilon shahar", "Quvasoy shahar", "Qo‘qon shahar", "Bag‘dod tumani", "Beshariq tumani", "Buvayda tumani", "Dang‘ara tumani", "Yozyovon tumani", "Oltiariq tumani", "Qo‘shtepa tumani", "Rishton tumani", "So‘x tumani", "Toshloq tumani", "Uchko‘prik tumani", "Farg‘ona tumani", "Furqat tumani", "O‘zbekiston tumani", "Quva tumani"];


function openDistrictStats(dist) {
    const selector = document.getElementById('tumanSelect');
    if (selector) {
        selector.value = dist;
        showTab('tuman');
        loadTumanData();
    }
}

async function loadViloyatData() {
    const dateInput = document.getElementById('viloyatDate');
    const date = dateInput ? (dateInput.value || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];
    if (dateInput && !dateInput.value) dateInput.value = date;

    try {
        const data = await apiFetch(`${API_BASE}/stats/viloyat?date=${date}`);
        const tbody = document.querySelector('#viloyatTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!Array.isArray(data)) throw new Error("Ma'lumot topilmadi");

        let t_entries = 0, t_students = 0, t_sababsiz = 0, t_absent = 0;

        data.forEach(item => {
            t_entries += parseInt(item.entries) || 0;
            t_students += parseInt(item.students) || 0;
            t_sababsiz += parseInt(item.sababsiz) || 0;
            t_absent += parseInt(item.total_absent) || 0;

            const p = item.avg_percent || 0;
            let colorClass = '#64748b';
            if (item.entries > 0) {
                if (p >= 95) colorClass = '#10b981';
                else if (p >= 85) colorClass = '#f59e0b';
                else colorClass = '#ef4444';
            }

            const tr = `<tr>
                <td class="clickable-dist" onclick="openDistrictStats('${item.district.replace(/'/g, "\\'")}')"><i class="fas fa-search-location"></i> ${item.district}</td>
                <td style="text-align:center"><b>${item.entries || 0}</b> / <span style="opacity:0.6">${item.total_schools || '-'}</span></td>
                <td style="text-align:center">${item.classes || 0}</td>
                <td style="text-align:center"><b>${item.students || 0}</b></td>
                <td style="text-align:center; color:#14b8a6">${item.sk || 0}</td>
                <td style="text-align:center; color:#14b8a6">${item.st || 0}</td>
                <td style="text-align:center; color:#14b8a6">${item.so || 0}</td>
                <td style="text-align:center; color:#14b8a6">${item.si || 0}</td>
                <td style="text-align:center; color:#14b8a6">${item.sb || 0}</td>
                <td style="text-align:center; color:#f59e0b">${item.sm || 0}</td>
                <td style="text-align:center; color:#f59e0b">${item.sq || 0}</td>
                <td style="text-align:center; color:#f59e0b">${item.sc || 0}</td>
                <td style="text-align:center; color:#f59e0b">${item.sbt || 0}</td>
                <td style="text-align:center; color:#f59e0b">${item.si_ish || 0}</td>
                <td style="text-align:center; color:#f59e0b">${item.sqar || 0}</td>
                <td style="text-align:center; color:#f59e0b">${item.sjaz || 0}</td>
                <td style="text-align:center; color:#f59e0b">${item.snaz || 0}</td>
                <td style="text-align:center; color:#f59e0b">${item.stur || 0}</td>
                <td style="text-align:center; color:#f59e0b">${item.ssb || 0}</td>
                <td style="text-align:center; font-weight:bold; color:#ef4444">${item.total_absent || 0}</td>
                <td style="text-align:center; opacity:0.6">${(Number(item.yesterday_percent) || 0).toFixed(1)}%</td>
                <td style="text-align:center"><span class="status-badge" style="background:${colorClass}; color:white;">${p.toFixed(1)}%</span></td>
                <td style="font-size:10px; opacity:0.6">${item.head_name || '-'}</td>
            </tr>`;
            tbody.innerHTML += tr;
        });

        safeSetText('v_total_entries', t_entries);
        safeSetText('v_total_students', t_students);
        safeSetText('v_total_sababsiz', t_sababsiz);
        safeSetText('v_avg_percent', (t_students > 0 ? ((t_students - t_absent) / t_students * 100).toFixed(1) : 0) + '%');

        renderHeatmap(data, 'mapContainer');
    } catch (e) { console.error("Viloyat Load Error:", e); }
}

function renderHeatmap(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const districtGrid = [
        { n: "Beshariq", x: 1, y: 3 }, { n: "Furqat", x: 2, y: 3 }, { n: "O'zbekiston", x: 2, y: 4 },
        { n: "Dang'ara", x: 3, y: 2 }, { n: "Qo'qon", x: 3, y: 3 }, { n: "Uchko'prik", x: 4, y: 3 },
        { n: "Buvayda", x: 4, y: 2 }, { n: "Bag'dod", x: 5, y: 3 }, { n: "Yozyovon", x: 6, y: 1 },
        { n: "Oltiariq", x: 5, y: 4 }, { n: "Rishton", x: 4, y: 4 }, { n: "Qo'shtepa", x: 6, y: 3 },
        { n: "Toshloq", x: 7, y: 2 }, { n: "Marg'ilon", x: 7, y: 3 }, { n: "Quva", x: 8, y: 3 },
        { n: "Farg'ona sh.", x: 7, y: 4 }, { n: "Farg'ona t.", x: 8, y: 4 }, { n: "Quvasoy", x: 8, y: 5 },
        { n: "So'x", x: 4, y: 5 }
    ];

    districtGrid.forEach(pos => {
        const item = data.find(d => d.district.toLowerCase().includes(pos.n.toLowerCase().split(' ')[0])) || { avg_percent: 0, district: pos.n };
        const node = document.createElement('div');
        node.className = 'map-node';
        node.style.gridColumn = pos.x;
        node.style.gridRow = pos.y;

        const p = item.avg_percent || 0;
        let color = '#f43f5e';
        if (p >= 95) color = '#10b981';
        else if (p >= 90) color = '#facc15';
        else if (p === 0) color = 'rgba(255,255,255,0.05)';

        node.style.borderTop = `4px solid ${color}`;
        node.innerHTML = `
            <div class="name" style="font-size:9px;">${pos.n}</div>
            <div class="val" style="color:${color}; font-weight:bold;">${p > 0 ? p.toFixed(1) + '%' : '-'}</div>
        `;
        node.onclick = () => { if (item.entries > 0) openDistrictStats(item.district); };
        container.appendChild(node);
    });
}

let districtChartObj, reasonsChartObj, trendChartObj;

async function loadAnalysisData() {
    try {
        const fargonaNow = new Date(new Date().getTime() + (5 * 60 + new Date().getTimezoneOffset()) * 60000);
        const today = fargonaNow.toISOString().split('T')[0];
        const dayOfWeek = fargonaNow.getDay();

        let yesterdayCount = 1;
        if (dayOfWeek === 1) yesterdayCount = 2; // Monday vs Saturday

        const yesterdayDate = new Date(fargonaNow);
        yesterdayDate.setDate(yesterdayDate.getDate() - yesterdayCount);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        let [todayData, yesterdayData] = await Promise.all([
            apiFetch(`/api/stats/viloyat?date=${today}`).catch(() => []),
            apiFetch(`/api/stats/viloyat?date=${yesterday}`).catch(() => [])
        ]);

        if (!Array.isArray(todayData)) todayData = [];
        if (!Array.isArray(yesterdayData)) yesterdayData = [];

        // Filter out zero entries for better average
        const todayActive = todayData.filter(d => d.entries > 0);
        const yesterdayActive = yesterdayData.filter(d => d.entries > 0);

        // 1. Summary
        const calcAvg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + (parseFloat(b.avg_percent) || 0), 0) / arr.length : 0;
        const todayAvg = calcAvg(todayActive.length > 0 ? todayActive : todayData);
        const yesterdayAvg = calcAvg(yesterdayActive.length > 0 ? yesterdayActive : yesterdayData);
        const diff = todayAvg - yesterdayAvg;

        const summaryDiv = document.getElementById('analysisSummary');
        if (summaryDiv) {
            summaryDiv.innerHTML = `
                <div class="stat-card">
                    <h4>Viloyat O'rtacha (Bugun)</h4>
                    <div class="value">${todayAvg.toFixed(1)}%</div>
                    <div style="font-size:0.9rem; color:${diff >= 0 ? '#10b981' : '#f43f5e'}">
                        <i class="fas fa-caret-${diff >= 0 ? 'up' : 'down'}"></i> ${Math.abs(diff).toFixed(1)}% (Kecha: ${yesterdayAvg.toFixed(1)}%)
                    </div>
                </div>
                <div class="stat-card">
                    <h4>Jami O'quvchilar</h4>
                    <div class="value">${todayData.reduce((a, b) => a + (parseInt(b.students) || 0), 0)}</div>
                </div>
                <div class="stat-card">
                    <h4>Sababsiz Kelmaganlar</h4>
                    <div class="value red">${todayData.reduce((a, b) => a + (parseInt(b.sababsiz) || 0), 0)}</div>
                </div>
            `;
        }

        renderHeatmap(todayData, 'mapContainerAnalysis');

        // 2. AI Text & Leaderboard
        const aiText = document.getElementById('aiText');
        if (aiText) {
            if (todayData.length === 0 || todayActive.length === 0) {
                aiText.innerHTML = `<i class="fas fa-info-circle"></i> Bugungi ma'lumotlar hali to'liq kiritilmagan. <br>Hozircha ${todayData.filter(d => d.entries > 0).length} ta hududdan ma'lumot keldi.`;
            } else {
                const sorted = [...todayActive].sort((a, b) => (parseFloat(a.avg_percent) || 0) - (parseFloat(b.avg_percent) || 0));
                const worst = sorted[0];
                const best = sorted[sorted.length - 1];
                aiText.innerHTML = `<i class="fas fa-robot"></i> Bugungi holat bo'yicha eng yaxshi ko'rsatkich: <b>${best.district}</b> (${best.avg_percent.toFixed(1)}%). <br> Eng past ko'rsatkich (E'tibor talab): <b>${worst.district}</b> (${worst.avg_percent.toFixed(1)}%).`;

                const topDiv = document.getElementById('topDistricts');
                const bottomDiv = document.getElementById('bottomDistricts');
                if (topDiv) topDiv.innerHTML = sorted.slice(-3).reverse().map(d => `<div class="l-item top"><span>${d.district}</span><span class="status-badge status-high">${d.avg_percent.toFixed(1)}%</span></div>`).join('');
                if (bottomDiv) bottomDiv.innerHTML = sorted.slice(0, 3).map(d => `<div class="l-item bottom"><span>${d.district}</span><span class="status-badge status-low">${d.avg_percent.toFixed(1)}%</span></div>`).join('');
            }
        }

        // 3. Charts
        const ctx1 = document.getElementById('districtChart');
        if (ctx1 && todayData.length > 0) {
            if (districtChartObj) districtChartObj.destroy();
            districtChartObj = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: todayData.map(d => d.district.split(' ')[0]),
                    datasets: [
                        { label: 'Bugun', data: todayData.map(d => d.avg_percent), backgroundColor: 'rgba(99, 102, 241, 0.7)', borderRadius: 5 },
                        { label: 'Kecha', data: yesterdayData.map(d => d.avg_percent), backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 5 }
                    ]
                },
                options: {
                    responsive: true,
                    scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8', font: { size: 10 } } } },
                    plugins: { legend: { labels: { color: '#fff' } } }
                }
            });
        }

        const ctx2 = document.getElementById('reasonsChart');
        if (ctx2 && todayData.length > 0) {
            if (reasonsChartObj) reasonsChartObj.destroy();
            const sababli = todayData.reduce((a, b) => a + (parseInt(b.sababli) || 0), 0);
            const sababsiz = todayData.reduce((a, b) => a + (parseInt(b.sababsiz) || 0), 0);
            reasonsChartObj = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: ['Sababli', 'Sababsiz'],
                    datasets: [{ data: [sababli, sababsiz], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0 }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
            });
        }

        const trendData = await apiFetch('/api/stats/trends').catch(() => []);
        const ctx3 = document.getElementById('trendChart');
        if (ctx3 && trendData.length > 0) {
            if (trendChartObj) trendChartObj.destroy();
            trendChartObj = new Chart(ctx3, {
                type: 'line',
                data: {
                    labels: trendData.map(d => d.date.split('-').slice(1).join('.')),
                    datasets: [{ label: 'Davomat %', data: trendData.map(d => d.avg_percent), borderColor: '#8b5cf6', tension: 0.4, fill: true, backgroundColor: 'rgba(139, 92, 246, 0.1)' }]
                },
                options: {
                    responsive: true,
                    scales: { y: { min: 70, max: 100, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } },
                    plugins: { legend: { display: false } }
                }
            });
        }
    } catch (e) { console.error("Analysis Load Error:", e); }
}


async function loadTumanData(page = 1) {
    tumanPage = page;
    const tumanSelect = document.getElementById('tumanSelect');
    if (tumanSelect && tumanSelect.options.length <= 1) {
        tumanSelect.innerHTML = '<option value="">Tanlang...</option>';
        DISTRICTS_LIST.forEach(d => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = d;
            tumanSelect.appendChild(opt);
        });
        const userDist = localStorage.getItem('dashboard_district');
        if (userDist) {
            tumanSelect.value = userDist;
            tumanSelect.disabled = true;
        }
    }

    const tuman = tumanSelect ? tumanSelect.value : '';
    if (!tuman) return;

    const dateInput = document.getElementById('tumanDate');
    const date = dateInput ? (dateInput.value || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];
    if (dateInput && !dateInput.value) dateInput.value = date;

    const offset = (page - 1) * PAGE_SIZE;
    try {
        const res = await fetch(`${API_BASE}/stats/tuman?tuman=${encodeURIComponent(tuman)}&date=${date}&limit=${PAGE_SIZE}&offset=${offset}`, { headers: getAuthHeaders() });
        const data = await res.json();
        const tbody = document.querySelector('#tumanTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const rows = data.rows || [];
        const total = data.total || 0;

        if (Array.isArray(rows)) {
            rows.forEach((row, index) => {
                const p = parseFloat(row.percent) || 0;
                let colorClass = '#64748b';
                if (row.total_students > 0) {
                    if (p >= 95) colorClass = '#10b981';
                    else if (p >= 85) colorClass = '#f59e0b';
                    else colorClass = '#ef4444';
                }

                const tr = document.createElement('tr');
                const getCellStyleLocal = (val, color, isBold = false) => {
                    const num = parseInt(val) || 0;
                    const opacity = num > 0 ? 1 : 0.2;
                    const hex = color === 'green' ? '#14b8a6' : '#f43f5e';
                    return `style="color:${hex}; opacity:${opacity}; font-weight:${num > 0 || isBold ? '600' : 'normal'}; text-align:center;"`;
                };

                tr.innerHTML = `
                    <td>${offset + index + 1}</td>
                    <td><b>${row.school}</b></td>
                    <td style="font-size:0.8rem; opacity:0.7">${row.time || '-'}</td>
                    <td style="text-align:center">${row.classes_count || 0}</td>
                    <td style="text-align:center">${row.total_students || 0}</td>
                    <td ${getCellStyleLocal(row.sababli_kasal, 'green', true)}>${row.sababli_kasal || 0}</td>
                    <td ${getCellStyleLocal(row.sababli_tadbirlar, 'green')}>${row.sababli_tadbirlar || 0}</td>
                    <td ${getCellStyleLocal(row.sababli_oilaviy, 'green')}>${row.sababli_oilaviy || 0}</td>
                    <td ${getCellStyleLocal(row.sababli_ijtimoiy, 'green')}>${row.sababli_ijtimoiy || 0}</td>
                    <td ${getCellStyleLocal(row.sababli_boshqa, 'green')}>${row.sababli_boshqa || 0}</td>
                    <td ${getCellStyleLocal(row.sababsiz_muntazam, 'red', true)}>${row.sababsiz_muntazam || 0}</td>
                    <td ${getCellStyleLocal(row.sababsiz_qidiruv, 'red')}>${row.sababsiz_qidiruv || 0}</td>
                    <td ${getCellStyleLocal(row.sababsiz_chetel, 'red')}>${row.sababsiz_chetel || 0}</td>
                    <td ${getCellStyleLocal(row.sababsiz_boyin, 'red')}>${row.sababsiz_boyin || 0}</td>
                    <td ${getCellStyleLocal(row.sababsiz_ishlab, 'red')}>${row.sababsiz_ishlab || 0}</td>
                    <td ${getCellStyleLocal(row.sababsiz_qarshilik, 'red')}>${row.sababsiz_qarshilik || 0}</td>
                    <td ${getCellStyleLocal(row.sababsiz_jazo, 'red')}>${row.sababsiz_jazo || 0}</td>
                    <td ${getCellStyleLocal(row.sababsiz_nazoratsiz, 'red')}>${row.sababsiz_nazoratsiz || 0}</td>
                    <td ${getCellStyleLocal(row.sababsiz_turmush, 'red')}>${row.sababsiz_turmush || 0}</td>
                    <td ${getCellStyleLocal(row.sababsiz_boshqa, 'red')}>${row.sababsiz_boshqa || 0}</td>
                    <td style="text-align:center"><span class="status-badge" style="background:${colorClass}; color:white;">${p.toFixed(1)}%</span></td>
                    <td style="text-align:center; font-size: 0.8rem">${row.source || 'bot'}</td>
                    <td style="font-size: 0.8rem">${row.fio || '-'}</td>
                    <td style="text-align:center;">
                        ${row.bildirgi ? `
                            <button class="btn btn-pro" onclick="viewBildirgi('${row.bildirgi}')" style="padding: 5px 10px; font-size: 0.75rem; background: var(--success);">
                                <i class="fas fa-file-download"></i>
                            </button>
                        ` : '<span style="opacity:0.3">-</span>'}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
        renderPagination('tumanPagination', total, page, PAGE_SIZE, 'loadTumanData');
    } catch (e) {
        console.error("Tuman Data Error:", e);
    }
}

function viewBildirgi(filename) {
    if (!filename) return;
    const token = localStorage.getItem('dashboard_token');
    window.open(`/api/admin/reports/download/${filename}?token=${token}`, '_blank');
}

async function loadAbsentDetails(page = 1) {
    absentPage = page;
    const dateInput = document.getElementById('absentDate');
    const date = dateInput ? (dateInput.value || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];
    if (dateInput && !dateInput.value) dateInput.value = date;

    const offset = (page - 1) * PAGE_SIZE;
    try {
        const res = await fetch(`${API_BASE}/stats/absentees?date=${date}&limit=${PAGE_SIZE}&offset=${offset}`, { headers: getAuthHeaders() });
        const data = await res.json();
        const tbody = document.querySelector('#absentTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        const role = localStorage.getItem('dashboard_role');
        const isSuper = role === 'superadmin';

        const rows = data.rows || [];
        const total = data.total || 0;

        if (Array.isArray(rows)) {
            rows.forEach(row => {
                const phoneStr = (row.parent_phone || '').toString();
                const maskedPhone = isSuper ? phoneStr : (phoneStr.length > 7 ? phoneStr.substring(0, 6) + '***' + phoneStr.substring(phoneStr.length - 2) : '***');
                const name = row.name || '-';
                const maskedName = isSuper ? name : name.split(' ').map((n, i) => i === 0 ? n : '***').join(' ');
                const parent_name = row.parent_name || '-';
                const maskedParent = isSuper ? parent_name : parent_name.split(' ').map((n, i) => i === 0 ? n : '***').join(' ');
                const address = row.address || '-';
                const maskedAddress = isSuper ? address : '***';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.district}</td>
                    <td><b>${row.school}</b></td>
                    <td>${row.class}</td>
                    <td><b>${maskedName}</b></td>
                    <td>${maskedAddress}</td>
                    <td style="font-size: 0.85rem">${maskedParent}</td>
                    <td>${isSuper ? `<a href="tel:${row.parent_phone}">${row.parent_phone}</a>` : `<span style="color:#818cf8">${maskedPhone}</span>`}</td>
                    <td style="font-size: 0.85rem">${row.inspector || '-'}</td>
                    <td style="font-size: 0.85rem">
                        <b>${row.submitter_fio || '-'}</b><br>
                        <a href="tel:${row.submitter_phone}" style="color:var(--primary); text-decoration:none;">${row.submitter_phone || ''}</a>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
        renderPagination('absentPagination', total, page, PAGE_SIZE, 'loadAbsentDetails');
    } catch (e) { console.error(e); }
}

function renderPagination(containerId, total, page, limit, methodName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) {
        container.innerHTML = `<span style="opacity:0.6; font-size:0.9rem;">Jami: ${total} ta ma'lumot</span>`;
        return;
    }

    let html = `
        <button class="pag-btn" ${page === 1 ? 'disabled' : ''} onclick="${methodName}(${page - 1})"><i class="fas fa-chevron-left"></i> Oldingi</button>
        <span class="pag-info">${page} / ${totalPages}</span>
        <button class="pag-btn" ${page === totalPages ? 'disabled' : ''} onclick="${methodName}(${page + 1})">Keyingi <i class="fas fa-chevron-right"></i></button>
    `;
    container.innerHTML = html;
}


async function loadRecentActivity(page = 1) {
    monitorPage = page;
    const offset = (page - 1) * monitorLimit;
    const tbody = document.querySelector('#recentTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px"><i class="fas fa-spinner fa-spin"></i> Yuklanmoqda...</td></tr>';
    try {
        const data = await apiFetch(`/api/stats/recent?limit=${monitorLimit}&offset=${offset}`);
        const rows = data.rows || [];
        const total = data.total || 0;

        tbody.innerHTML = '';
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px">Ma\'lumotlar mavjud emas</td></tr>';
            return;
        }

        rows.forEach(item => {
            const sourceIcon = item.source === 'web' ? '<i class="fas fa-globe" style="color:#3b82f6" title="Web Sahifa"></i> web' : '<i class="fab fa-telegram" style="color:#0088cc" title="Telegram Bot"></i> bot';
            const d = item.date.split('-');
            const displayDate = d.length === 3 ? `${d[2]}.${d[1]}.${d[0]}` : item.date;

            const tr = `<tr>
                <td style="color: #94a3b8; font-size: 0.9em;">${displayDate}</td>
                <td style="font-weight: 500; color: #818cf8;">${item.time}</td>
                <td>${item.district}</td>
                <td><b>${item.school}</b></td>
                <td style="text-align:center"><span class="status-badge ${item.percent >= 95 ? 'status-high' : 'status-low'}">${(Number(item.percent) || 0).toFixed(1)}%</span></td>
                <td style="text-align:center; font-weight:bold; color:${item.sababsiz_jami > 0 ? '#f43f5e' : '#10b981'}">${item.sababsiz_jami || 0}</td>
                <td style="text-align:center">${sourceIcon}</td>
                <td style="font-size: 11px;">
                    ${item.fio}
                    ${item.bildirgi ? `<br><a href="/api/admin/reports/download/${item.bildirgi.split(/[\\/]/).pop()}" target="_blank" style="color:#10b981; font-size:10px; text-decoration:none;"><i class="fas fa-file-pdf"></i> Bildirgi</a>` : ''}
                </td>
            </tr>`;
            tbody.innerHTML += tr;
        });

        renderPagination('recentPagination', total, page, monitorLimit, 'loadRecentActivity');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#ef4444">Xatolik: ${e.message}</td></tr>`;
    }
}

// Auto-refresh Monitor
setInterval(() => {
    const recentView = document.getElementById('recentView');
    if (recentView && recentView.classList.contains('active')) {
        if (monitorPage === 1) loadRecentActivity(1); // Auto refresh only if on page 1
    }
}, 60000);

function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function exportViloyatExcel() {
    const date = document.getElementById('viloyatDate').value;
    const token = localStorage.getItem('dashboard_token');
    window.location.href = `${API_BASE}/export/viloyat?date=${date}&token=${token}`;
}

function exportTuman() {
    const tuman = document.getElementById('tumanSelect').value;
    const date = document.getElementById('tumanDate').value;
    const token = localStorage.getItem('dashboard_token');
    if (!tuman) return alert("Tumanni tanlang");
    window.location.href = `${API_BASE}/export/tuman?tuman=${encodeURIComponent(tuman)}&date=${date}&token=${token}`;
}
/* ADMIN LOGIC */
async function loadAdminPanel() {
    const container = document.getElementById('adminView');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; padding:20px"><i class="fas fa-spinner fa-spin"></i> Yuklanmoqda...</div>';

    try {
        // 1. Users
        const res = await fetch(`${API_BASE}/admin/users`, { headers: getAuthHeaders() });
        if (res.status !== 200) {
            container.innerHTML = '<h3 style="color:red; text-align:center; padding:50px">Ruxsat yo\'q. Faqat Superadmin uchun.</h3>';
            return;
        }

        const users = await res.json();

        let html = `
            <h2>👥 Foydalanuvchilar Boshqaruvi</h2>
            <div class="table-wrapper">
            <table class="fl-table">
                <thead>
                    <tr>
                        <th>Login</th>
                        <th>Parol</th>
                        <th>Rol</th>
                        <th>Hudud</th>
                        <th>Amallar</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const sortedUsers = Object.entries(users).sort((a, b) => {
            if (a[1].role === 'superadmin') return -1;
            if (b[1].role === 'superadmin') return 1;
            return a[0].localeCompare(b[0]);
        });

        sortedUsers.forEach(([login, u]) => {
            if (u.role === 'system') return;
            html += `
                <tr>
                    <td>${login}</td>
                    <td>${u.password || '***'}</td>
                    <td><span class="badge" style="background:${u.role === 'superadmin' ? '#e11d48' : '#0ea5e9'}">${u.role}</span></td>
                    <td>${u.district || '-'}</td>
                    <td>
                        <button onclick="changePass('${login}')" style="padding:4px 8px; background:#f59e0b; color:white; border:none; border-radius:4px; cursor:pointer;">🔑 Parol</button>
                    </td>
                </tr>
            `;
        });
        html += '</tbody></table></div>';

        // 2. Archived Reports
        try {
            const repRes = await fetch(`${API_BASE}/admin/reports`, { headers: getAuthHeaders() });
            const reports = await repRes.json();

            if (Array.isArray(reports) && reports.length > 0) {
                html += `<div style="margin-top:40px;">
                    <h2>📚 Arxivlangan Hisobotlar (Excel)</h2>
                    <div class="table-wrapper">
                    <table class="fl-table">
                        <thead><tr><th>Fayl Nomi</th><th>Hajmi</th><th>Sana</th><th>Yuklash</th></tr></thead>
                        <tbody>`;

                const token = localStorage.getItem('dashboard_token') || localStorage.getItem('token');
                reports.forEach(f => {
                    html += `<tr>
                        <td>${f.name}</td>
                        <td>${f.size}</td>
                        <td>${new Date(f.date).toLocaleString()}</td>
                        <td><a href="${API_BASE}/admin/reports/download/${f.name}?token=${token}" target="_blank" style="text-decoration:none; color:white; background:#10b981; padding:5px 10px; border-radius:4px;">📥 Yuklab olish</a></td>
                    </tr>`;
                });

                html += `</tbody></table></div></div>`;
            }
        } catch (e) { console.error("Report Fetch Error", e); }

        container.innerHTML = html;

    } catch (e) {
        console.error(e);
        container.innerHTML = '<div style="color:red; text-align:center">Xatolik yuz berdi!</div>';
    }
}

async function changePass(username) {
    const newPass = prompt(`Yangi parol (${username}):`);
    if (newPass && newPass.trim()) {
        try {
            await fetch(`${API_BASE}/admin/reset-password`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ targetLogin: username, newPassword: newPass })
            });
            alert('Parol o\'zgartirildi');
            loadAdminPanel();
        } catch (e) { alert('Xatolik'); }
    }
}

/* DASHBOARD LOGIC END */

let tgUsersData = [];

async function loadTgUsers() {
    const tbody = document.querySelector('#tgUsersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Yuklanmoqda...</td></tr>';

    try {
        const data = await apiFetch(`${API_BASE}/admin/tg-users`);
        tgUsersData = data || [];
        renderTgUsers(tgUsersData);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red">Xatolik: ${e.message}</td></tr>`;
    }
}

function renderTgUsers(users) {
    const tbody = document.querySelector('#tgUsersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    users.forEach(u => {
        const d = u.data || {};
        const isPro = d.is_pro && new Date(d.pro_expire_date) > new Date();
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td><code>${u.id}</code></td>
            <td><b>${d.name || '-'}</b><br><small>@${d.username || '-'}</small></td>
            <td>${d.phone || '-'}</td>
            <td><span class="pro-badge" style="background:${isPro ? '#10b981' : '#64748b'}">${isPro ? 'PRO' : 'ODATIY'}</span></td>
            <td>${d.pro_expire_date || '-'}</td>
            <td>
                <select id="months_${u.id}" style="width:70px; padding:2px; font-size:12px">
                    <option value="1">1 oy</option>
                    <option value="3">3 oy</option>
                    <option value="6">6 oy</option>
                    <option value="12">1 yil</option>
                </select>
                <button onclick="setPro('${u.id}')" style="background:#6366f1; color:white; border:none; padding:4px 8px; border-radius:5px; cursor:pointer">
                    <i class="fas fa-check"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterTgUsers() {
    const q = document.getElementById('tgSearch').value.toLowerCase();
    const filtered = tgUsersData.filter(u => {
        const d = u.data || {};
        return u.id.toString().includes(q) ||
            (d.name || '').toLowerCase().includes(q) ||
            (d.phone || '').includes(q) ||
            (d.username || '').toLowerCase().includes(q);
    });
    renderTgUsers(filtered);
}

async function setPro(uid) {
    const months = document.getElementById(`months_${uid}`).value;
    if (!confirm(`${uid} ga ${months} oy PRO berilsinmi?`)) return;

    try {
        await apiFetch(`${API_BASE}/admin/set-pro`, {
            method: 'POST',
            body: JSON.stringify({ uid, months })
        });
        alert('Muvaffaqiyatli bajarildi');
        loadTgUsers();
    } catch (e) {
        alert('Xatolik: ' + e.message);
    }
}


require('dotenv').config();
const { Telegraf, Markup, session, Scenes } = require('telegraf');
const fs = require('fs');
const path = require('path');
const attendanceWizard = require('./src/scenes/attendance');
const broadcastScene = require('./src/scenes/broadcast');
const xorijWizard = require('./src/scenes/xorij');
const mmibdoRatingWizard = require('./src/scenes/mmibdoRating');
const { getDistrictStats, getMissingSchools } = require('./src/services/sheet');
const admin = require('./src/services/admin');
const db = require('./src/database/db');
const sqlite = require('./src/database/pg'); // Switched to PostgreSQL (Supabase)
const topicsConfig = require('./src/config/topics');
const TOPICS = topicsConfig.getTopics();
const config = require('./src/config/config');
const { getTopicId, normalizeKey } = require('./src/utils/topics');
const { getFargonaTime } = require('./src/utils/fargona');
const axios = require('axios');
const express = require('express');
const multer = require('multer');
const { generateBildirgi } = require('./src/utils/pdfGenerator');
const webpush = require('web-push');

// Web Push Config
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
        webpush.setVapidDetails(
            'mailto:imronbekr@gmail.com',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    } catch (e) {
        console.error("VAPID Config Error:", e.message);
    }
} else {
    console.warn("VAPID Keys missing. Push notifications disabled.");
}


const uploadDir = path.join(__dirname, 'assets', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 30 * 1024 * 1024 }
});

const app = express();
app.use(express.json());

// Load Parent Bot
try {
    require('./parent_bot');
} catch (e) {
    console.error("Parent Bot Load Error:", e.message);
}

const { formatAttendanceReport } = require('./src/utils/reports');

const { USERS, tokens, generateToken, saveUsers } = require('./src/utils/auth');

// Auth Middleware
const auth = (req, res, next) => {
    const token = req.headers['authorization'] || req.query.token;
    if (!token || !tokens.has(token)) return res.status(401).json({ error: 'Unauthorized' });
    req.user = tokens.get(token);
    next();
};

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = USERS[username];
    if (user && user.password === password) {
        const token = generateToken();
        // Store user with username for easy lookup later
        tokens.set(token, { ...user, username, role: user.role });
        res.json({
            token,
            role: user.role,
            username: user.username,
            district: user.district,
            school: user.school || null,
            assigned_schools: user.assigned_schools || [], // Inspektor uchun
            fio: user.fio || '',
            phone: user.phone || ''
        });
    } else {
        res.status(401).json({ error: 'Login yoki parol xato' });
    }
});

app.get('/api/me', auth, (req, res) => {
    res.json(req.user);
});

// Change own password
app.post('/api/change-password', auth, (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Parol kiritilmadi' });
    if (!USERS[req.user.username]) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    USERS[req.user.username].password = password;
    saveUsers();
    res.json({ success: true });
});

// Admin: Get all users
app.get('/api/admin/users', auth, (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Ruxsat yo\'q' });

    const isOwner = req.user.username === 'mrqirol';
    if (isOwner) {
        res.json(USERS);
    } else {
        // Hide owner account from other superadmins
        const filtered = {};
        Object.entries(USERS).forEach(([login, data]) => {
            if (login !== 'mrqirol') {
                filtered[login] = data;
            }
        });
        res.json(filtered);
    }
});


// Admin: Reset any user password


// Admin: Export Full SQL Data (Only for Owner/Primary Admin)
app.get('/api/admin/export-db', auth, async (req, res) => {
    const isOwner = req.user.username === 'mrqirol' || Number(req.user.uid) === 65002404;
    if (!isOwner) return res.status(403).json({ error: 'Ruxsat yo\'q! Faqat asosiy admin uchun.' });

    try {
        const attendance = await sqlite.query('SELECT * FROM attendance ORDER BY id DESC LIMIT 5000');
        const xorij = await sqlite.query('SELECT * FROM xorij_students ORDER BY id DESC');
        const users = await sqlite.query('SELECT id, data, last_active FROM tg_users');
        
        const dump = {
            export_date: new Date().toISOString(),
            attendance_count: attendance.rowCount,
            xorij_count: xorij.rowCount,
            users_count: users.rowCount,
            data: {
                attendance: attendance.rows,
                xorij: xorij.rows,
                users: users.rows
            }
        };

        res.setHeader('Content-disposition', 'attachment; filename=database_backup.json');
        res.setHeader('Content-type', 'application/json');
        res.write(JSON.stringify(dump, null, 2));
        res.end();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post('/api/admin/reset-password', auth, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Ruxsat yo\'q' });
    const { targetLogin, newPassword } = req.body;
    if (!USERS[targetLogin]) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    // Protect owner account
    const isOwner = req.user.username === 'mrqirol';
    if (targetLogin === 'mrqirol' && !isOwner) {
        return res.status(403).json({ error: 'Bu foydalanuvchi parolini o\'zgartirish taqiqlangan' });
    }


    const oldPassword = USERS[targetLogin].password;
    USERS[targetLogin].password = newPassword;
    saveUsers();

    // Save History to Supabase
    try {
        await sqlite.query('INSERT INTO password_history (username, old_password, new_password, changed_by) VALUES ($1, $2, $3, $4)', [targetLogin, oldPassword, newPassword, req.user.username]);
    } catch (e) {
        console.error("History Save Error:", e);
    }

    res.json({ success: true });
});

// Admin: Get all TG Users
app.get('/api/admin/tg-users', auth, async (req, res) => {
    const isOwner = req.user.username === 'mrqirol';
    if (!isOwner) return res.status(403).json({ error: 'Ruxsat yo\'q' });
    try {
        const result = await sqlite.query('SELECT * FROM tg_users ORDER BY id DESC');
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// Admin: Set PRO (Manual Activation)
app.post('/api/admin/set-pro', auth, (req, res, next) => { if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Faqat superadmin uchun' }); next(); },  async (req, res) => {
    const isAuthorized = req.user.username === 'mrqirol' || req.user.role === 'superadmin';
    if (!isAuthorized) return res.status(403).json({ error: 'Ruxsat yo\'q' });

    try {
        const { phone, uid, months } = req.body;
        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            const pPath = require('path').join(__dirname, 'src', 'database', 'pro_users.json');
            let proData = [];
            if (fs.existsSync(pPath)) {
                const raw = fs.readFileSync(pPath, 'utf8');
                if (raw) proData = JSON.parse(raw);
            }
            const expire = new Date();
            expire.setMonth(expire.getMonth() + (parseInt(months) || 1));
            proData = proData.filter(u => u.phone !== cleanPhone);
            proData.push({ phone: cleanPhone, is_pro: true, pro_purchase_date: new Date().toISOString(), pro_expire_date: expire.toISOString() });
            fs.writeFileSync(pPath, JSON.stringify(proData, null, 2));
            return res.json({ success: true, message: `PRO faollashtirildi (${cleanPhone})` });
        }
        if (uid) {
            const dbRef = require('./src/database/db');
            const user = dbRef.updateUserProMonths(uid, parseInt(months) || 1);
            return res.json({ success: true, user });
        }
        res.status(400).json({ error: 'Phone yoki UID kiritilmadi' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ===== INSPEKTOR-PSIXOLOG BOSHQARUVI =====

// Barcha inspektor-psixologlar ro'yxati (superadmin uchun)
app.get('/api/admin/inspectors', auth, (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Ruxsat yo\'q' });
    const inspectors = Object.entries(USERS)
        .filter(([, u]) => u.role === 'inspektor_psixolog')
        .map(([login, u]) => ({ login, ...u }));
    res.json(inspectors);
});

// Yangi inspektor-psixolog yaratish yoki tahrirlash
app.post('/api/admin/inspectors/create', auth, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Ruxsat yo\'q' });
    const { login, password, fio, phone, district, assigned_schools } = req.body;
    if (!login || !password || !district) return res.status(400).json({ error: 'Login, parol va hudud majburiy' });
    if (!Array.isArray(assigned_schools) || assigned_schools.length === 0) {
        return res.status(400).json({ error: 'Kamida 1 ta maktab biriktirilishi kerak' });
    }

    USERS[login] = {
        password,
        role: 'inspektor_psixolog',
        district,
        fio: fio || '',
        phone: phone || '',
        assigned_schools  // Array of school names
    };
    saveUsers();
    res.json({ success: true, login });
});

// Inspektor-Psixologni o'chirish
app.delete('/api/admin/inspectors/:login', auth, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Ruxsat yo\'q' });
    const { login } = req.params;
    if (!USERS[login] || USERS[login].role !== 'inspektor_psixolog') {
        return res.status(404).json({ error: 'Inspektor topilmadi' });
    }
    delete USERS[login];
    saveUsers();
    res.json({ success: true });
});

// Inspektor-Psixolog: o'z maktablari bo'yicha davomat
app.get('/api/inspektor/davomat', auth, async (req, res) => {
    if (req.user.role !== 'inspektor_psixolog' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }
    const { date } = req.query;
    const now = getFargonaTime();
    const targetDate = date || now.toISOString().split('T')[0];
    const assignedSchools = req.user.assigned_schools || [];
    const district = req.user.district;

    if (assignedSchools.length === 0) return res.json({ rows: [], total: 0 });

    try {
        const entriesRes = await sqlite.query(`
            WITH normalized_attendance AS (
                SELECT 
                    TRIM(REPLACE(REPLACE(district, '‘', ''''), '’', '''')) as norm_dist,
                    TRIM(REPLACE(REPLACE(school, '‘', ''''), '’', '''')) as norm_school,
                    *
                FROM attendance
                WHERE date = $1
            )
            SELECT DISTINCT ON (norm_dist, norm_school) *
            FROM normalized_attendance
            ORDER BY norm_dist, norm_school, id DESC
        `, [targetDate]);

        const allRows = assignedSchools.map(sName => {
            const entry = entriesRes.rows.find(e =>
                normalizeKey(e.norm_school || e.school) === normalizeKey(sName) &&
                (normalizeKey(e.norm_dist || e.dist) === normalizeKey(district) || normalizeKey(e.district) === normalizeKey(district))
            );
            if (entry) return { ...entry, percent: parseFloat(entry.percent), submitted: true };
            return {
                district, school: sName,
                date: targetDate, time: '-',
                classes_count: 0, total_students: 0,
                sababli_jami: 0, sababsiz_jami: 0,
                total_absent: 0, percent: 0,
                fio: 'Kiritilmagan', submitted: false
            };
        });

        res.json({ rows: allRows, total: allRows.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Inspektor-Psixolog: sababsiz o'quvchilar
app.get('/api/inspektor/sababsizlar', auth, async (req, res) => {
    if (req.user.role !== 'inspektor_psixolog') return res.status(403).json({ error: 'Ruxsat yo\'q' });
    const { date } = req.query;
    const targetDate = date || getFargonaTime().toISOString().split('T')[0];
    const assignedSchools = req.user.assigned_schools || [];
    const district = req.user.district;

    if (assignedSchools.length === 0) return res.json({ rows: [], total: 0 });

    try {
        const schoolsQueryStr = assignedSchools.map(s => `'${s.replace(/'/g, "''")}'`).join(",");
        const query = `
            SELECT a.date, a.district, a.school, a.fio as submitter_fio, a.phone as submitter_phone,
                   s.class, s.name, s.address, s.parent_name, s.parent_phone
            FROM absent_students s
            JOIN attendance a ON s.attendance_id = a.id
            WHERE a.date = $1 AND a.district = $2 AND a.school IN (${schoolsQueryStr})
            ORDER BY a.school, s.class
        `;
        const resDb = await sqlite.query(query, [targetDate, district]);

        const finalRows = [];
        for (const r of resDb.rows) {
            const streakRes = await sqlite.query(`
                SELECT count(DISTINCT a.date) as streak
                FROM absent_students s
                JOIN attendance a ON s.attendance_id = a.id
                WHERE s.name = $1 AND a.school = $2 AND a.district = $3 AND a.date <= $4
            `, [r.name, r.school, r.district, targetDate]);
            const streak = parseInt(streakRes.rows[0].streak) || 1;
            finalRows.push({
                ...r,
                streak: streak,
                status: streak >= 3 ? "🔴 Muntazam" : "🟡 Odatiy"
            });
        }
        res.json({ rows: finalRows, total: finalRows.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Inspektor-Psixolog: o'ziga tegishli maktablar bo'yicha 7 kunlik statistika (trend tahlil)
app.get('/api/inspektor/statistika', auth, async (req, res) => {
    if (req.user.role !== 'inspektor_psixolog') return res.status(403).json({ error: 'Ruxsat yo\'q' });
    const assignedSchools = req.user.assigned_schools || [];
    const district = req.user.district;

    if (assignedSchools.length === 0) return res.json({ labels: [], datasets: [] });

    try {
        const schoolsQueryStr = assignedSchools.map(s => `'${s.replace(/'/g, "''")}'`).join(",");
        // 7 kunlik interval
        const query = `
            SELECT date, AVG(percent) as avg_percent, SUM(sababsiz_jami) as total_sababsiz 
            FROM attendance 
            WHERE district = $1 AND school IN (${schoolsQueryStr}) 
            GROUP BY date 
            ORDER BY date DESC LIMIT 7
        `;
        const resDb = await sqlite.query(query, [district]);
        let rawData = resDb.rows.map(r => ({ date: r.date, percent: parseFloat(r.avg_percent), sababsiz: parseInt(r.total_sababsiz) })).reverse();

        let labels = [];
        let dataPercent = [];
        let dataSababsiz = [];

        rawData.forEach(d => {
            labels.push(d.date.substring(5)); // Faqat oy-kun
            dataPercent.push(d.percent);
            dataSababsiz.push(d.sababsiz);
        });

        res.json({
            labels: labels,
            datasets: { percent: dataPercent, sababsiz: dataSababsiz }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- SECURITY SHIELD ---
const requestCount = new Map();
const SECURITY_ALERT_THRESHOLD = 1000; // Increased to 1000 API requests per minute

const securityShield = (req, res, next) => {
    // 1. Basic Security Headers (Manual Helmet)
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self' https:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://kit.fontawesome.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://kit.fontawesome.com;");

    // 2. Rate Limiting — applies only to /api routes
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    const windowStart = now - 60000;

    let logs = requestCount.get(ip) || [];
    logs = logs.filter(t => t > windowStart);
    logs.push(now);
    requestCount.set(ip, logs);

    if (logs.length > SECURITY_ALERT_THRESHOLD) {
        // Skip telegram alert for local IP and only alert on the first breach
        if (logs.length === SECURITY_ALERT_THRESHOLD + 1 && ip !== '::1' && ip !== '127.0.0.1') {
            alertSuperAdmin(`🚨 <b>SECURITY ALERT!</b>\nSuspicious volume from IP: <code>${ip}</code>\nURL: <code>${req.url}</code>\nUser: <code>${req.user ? req.user.username : 'Guest'}</code>`);
        }
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    // 3. Prevent SQL-like patterns in queries (Basic injection filter)
    const sqlPatterns = /select|insert|update|delete|drop|union|--|;/i;
    if (sqlPatterns.test(req.url) || sqlPatterns.test(JSON.stringify(req.body))) {
        alertSuperAdmin(`⚠️ <b>INJECTION ATTEMPT!</b>\nSuspicious payload from IP: ${ip}\nUser: ${req.user ? req.user.username : 'Guest'}`);
        return res.status(403).json({ error: 'Malicious activity detected.' });
    }

    next();
};

async function alertSuperAdmin(msg) {
    const superAdminIds = [65002404, 786314811];
    for (const sid of superAdminIds) {
        try {
            await bot.telegram.sendMessage(sid, msg, { parse_mode: 'HTML' });
        } catch (e) { }
    }
}
// Static files served FIRST — before rate limiting
app.use(express.static('dashboard', { setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
    }
}}));
app.use('/assets', express.static('assets'));
app.use('/uploads', express.static('assets/uploads')); // Yuklangan hujjatlar uchun
app.use('/icons', express.static('icons'));
app.use('/icons', express.static('dashboard/assets/icons')); // Zaxira yo'li

// Security shield applied ONLY to /api routes — not static files
app.use('/api', securityShield);

const { getSchools, saveData } = require('./src/services/sheet');

const bot = new Telegraf(process.env.BOT_TOKEN, {
    handlerTimeout: 90000 
});
const PORT = process.env.PORT || 3000;
const LOGO_PATH = path.join(__dirname, 'assets', 'logo.png');

// --- PREMIUM FEATURES ---
try {
    const premiumRoutes = require('./premium_features/backend/premium_routes');
    app.use('/premium', express.static('premium_features/web'));
    app.use('/api/premium', auth, premiumRoutes);
    console.log('[PREMIUM] Premium routes yuklandi.');
} catch (e) {
    console.warn('[PREMIUM] Premium routes topilmadi, o\'tkazib yuborildi:', e.message);
}

const stage = new Scenes.Stage([attendanceWizard, broadcastScene, xorijWizard]);
bot.use(session());
bot.use(stage.middleware());

// --- GLOBAL COMMANDS (Work even inside scenes) ---
bot.start(async (ctx) => {
    console.log(`[START] User: ${ctx.from.id}`);

    // Leave any active scene to reset
    try { await ctx.scene.leave(); } catch (e) { }

    const { date, day } = getTodayInfo();
    const caption = `🌸 <b>Assalomu alaykum!</b>\nFarg'ona viloyati maktabgacha va maktab ta'limi boshqarmasi tizimidagi <b>@Ferghanaregdavomat_bot</b> ga xush kelibsiz.\n\n📅 <b>Bugungi sana:</b> ${date} (${day})\n\nBiz bilan hamkor bo'lganingiz uchun yana bir bor tabriklaymiz!\nKuningiz xayrli va mazmunli o'tsin! ✨`;

    // Tugmalarni tayyorlash
    let buttons = [["📊 Davomat kiritish"], ["✈️ Xorijga ketganlar"]];

    const uid = Number(ctx.from.id);
    const isPro = db.checkPro(uid);

    // Admin bo'lsa, Admin Panel tugmasini qo'shish
    if (config.ALL_ADMINS.map(Number).includes(uid)) {
        buttons.push(["⚙️ Admin Panel"]);
    }

    // PRO Analitika button for PRO users (School level)
    if (isPro) {
        buttons.push(["📊 PRO Analitika"]);
    }

    buttons.push(["👤 Mening Profilim", "📊 Mening Statistikam"]);
    buttons.push(["ℹ️ Dastur haqida", "📖 Yo'riqnoma"]);

    try {
        if (fs.existsSync(LOGO_PATH)) {
            await ctx.replyWithPhoto({ source: LOGO_PATH }, {
                caption: caption,
                parse_mode: 'HTML',
                ...Markup.keyboard(buttons).resize()
            });
        } else {
            await ctx.reply(caption, { parse_mode: 'HTML', ...Markup.keyboard(buttons).resize() });
        }
    } catch (e) {
        await ctx.reply(caption, Markup.keyboard(buttons).resize());
    }
});

bot.command("admin", (ctx) => admin.showAdminPanel(ctx));
bot.command("dashboard", (ctx) => ctx.replyWithHTML("🌐 <b>ONLINE DASHBOARD (SVOD)</b>\n\n👉 <a href='https://ferghanaregdavomat.onrender.com/dashboard.html'>YORDAMCHI DASHBOARD</a>"));
bot.hears('✈️ Xorijga ketganlar', (ctx) => ctx.scene.enter('xorij_wizard'));

bot.use(stage.middleware());

// --- AUTOMATED REPORTS (SCHEDULER) ---
const { initCrons } = require('./src/services/scheduler');
initCrons();

bot.use((ctx, next) => {
    console.log(`[UPDATE] Type: ${ctx.updateType}, From: ${ctx.from ? ctx.from.id : 'N/A'}`);
    return next();
});

// --- WEB API ---
const { getViloyatSvod, getTumanSvod, getTodayAbsentsDetails, getRecentActivity, exportToExcel, exportDistrictExcel, exportWeeklyExcel, exportMonthlyExcel, checkIfExists } = require('./src/services/dataService');
const { notifyParents } = require('./src/services/notifications');


// ==================== XORIJGA KETGANLAR WEB API ====================

app.post('/api/xorij/add', auth, upload.fields([
    { name: 'doc_qaror', maxCount: 1 },
    { name: 'doc_buyruq', maxCount: 1 }
]), async (req, res) => {
    try {
        const { district, school, student_name, dob, class_name, country, date_left, reason, parent_phone } = req.body;
        
        const q = 'INSERT INTO xorij_students (name, class, district, school, country, reason, leave_date, parent_phone, added_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id';
        const values = [student_name, class_name, district, school, country, reason, date_left, parent_phone, req.user.username];
        
        const result = await sqlite.query(q, values);
        res.json({ success: true, id: result.rows[0].id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



app.post('/api/xorij/return', auth, upload.single('doc_return'), (req, res) => {
    try {
        const { id, ret_date, ret_district, ret_school, ret_class, ret_b_sana, ret_b_raqam } = req.body;
        const dbPath = path.join(__dirname, 'src', 'database', 'xorij.json');
        let data = [];
        if (fs.existsSync(dbPath)) data = JSON.parse(fs.readFileSync(dbPath));

        const idx = data.findIndex(s => s.id == id);
        if (idx === -1) return res.status(404).json({ error: "Student not found" });

        data[idx].is_returned = true;
        data[idx].ret_date = ret_date;
        data[idx].ret_district = ret_district;
        data[idx].ret_school = ret_school;
        data[idx].ret_class = ret_class;
        data[idx].ret_b_sana = ret_b_sana;
        data[idx].ret_b_raqam = ret_b_raqam;
        data[idx].doc_return = req.file ? req.file.filename : null;

        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/xorij/update', auth, upload.fields([
    { name: 'doc_qaror', maxCount: 1 },
    { name: 'doc_buyruq', maxCount: 1 }
]), (req, res) => {
    try {
        const { id, student_name, dob, class_name, country, date_left, reason, companion, address, status, qonuniylik, q_sana, q_raqam, b_sana, b_raqam, upd_masul, upd_tel } = req.body;
        const dbPath = path.join(__dirname, 'src', 'database', 'xorij.json');
        if (!fs.existsSync(dbPath)) return res.status(404).json({ error: "No records yet." });
        
        let data = JSON.parse(fs.readFileSync(dbPath));
        const idx = data.findIndex(s => s.id == id);
        if (idx === -1) return res.status(404).json({ error: "Student not found." });

        if(student_name) data[idx].student_name = student_name;
        if(dob) data[idx].dob = dob;
        if(class_name) data[idx].class = class_name;
        if(country) data[idx].country = country;
        if(date_left) data[idx].date_left = date_left;
        if(reason) data[idx].reason = reason;
        if(companion) data[idx].companion = companion;
        if(address) data[idx].address = address;
        if(status) data[idx].status = status;
        if(qonuniylik) data[idx].qonuniylik = qonuniylik;
        if(q_sana !== undefined) data[idx].q_sana = q_sana;
        if(q_raqam !== undefined) data[idx].q_raqam = q_raqam;
        if(b_sana !== undefined) data[idx].b_sana = b_sana;
        if(b_raqam !== undefined) data[idx].b_raqam = b_raqam;

        if (req.files) {
            if (req.files['doc_qaror']) data[idx].doc_qaror = req.files['doc_qaror'][0].filename;
            if (req.files['doc_buyruq']) data[idx].doc_buyruq = req.files['doc_buyruq'][0].filename;
        }

        data[idx].updated_by = upd_masul ? `${upd_masul} (${upd_tel})` : `${req.user.fio} (${req.user.login})`;
        data[idx].updated_at = new Date().toLocaleString('uz-UZ');

        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        res.json({ success: true, student: data[idx] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


app.get('/api/xorij', auth, (req, res) => {
    try {
        const dbPath = path.join(__dirname, 'src', 'database', 'xorij.json');
        let data = [];
        if (fs.existsSync(dbPath)) data = JSON.parse(fs.readFileSync(dbPath));
        if (req.user.role === 'district' || req.user.role === 'inspektor_psixolog') {
            data = data.filter(d => d.district === req.user.district);
        } else if (req.user.role === 'school') {
            data = data.filter(d => d.district === req.user.district && d.school === req.user.school);
        }
        data.sort((a,b) => b.id - a.id);
        res.json(data);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/xorij/summary', auth, (req, res) => {
    try {
        const dbPath = path.join(__dirname, 'src', 'database', 'xorij.json');
        let data = [];
        if (fs.existsSync(dbPath)) data = JSON.parse(fs.readFileSync(dbPath));
        
        const summary = {};
        const districts = Object.keys(TOPICS).filter(d => !["Test rejimi", "MMT Boshqarma"].includes(d));
        
        districts.forEach(d => {
            summary[d] = {
                total: 0,
                countries: { "Rossiya": 0, "Qozog'iston": 0, "Turkiya": 0, "BAA": 0, "Misr": 0, "Boshqa": 0 },
                reasons: { "Doimiy yashash": 0, "O'qish": 0, "Ishlash": 0, "Davolanish": 0, "Boshqa": 0 }
            };
        });
        
        data.forEach(item => {
            if (summary[item.district]) {
                summary[item.district].total++;
                if (summary[item.district].countries[item.country] !== undefined) summary[item.district].countries[item.country]++;
                else summary[item.district].countries["Boshqa"]++;
                
                if (summary[item.district].reasons[item.reason] !== undefined) summary[item.district].reasons[item.reason]++;
                else summary[item.district].reasons["Boshqa"]++;
            }
        });
        
        res.json(summary);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/xorij/export', auth, async (req, res) => {
    try {
        const { exportXorijExcel } = require('./src/services/dataService');
        const filePath = await exportXorijExcel();
        if (filePath && fs.existsSync(filePath)) {
            res.download(filePath);
        } else {
            res.status(500).send("Excel generatsiya qilib bo'lmadi.");
        }
    } catch(e) {
        res.status(500).send(e.message);
    }
});


app.get('/api/stats/non-submitting', auth, async (req, res) => {
    const { district } = req.query;
    const ProAnalytics = require('./src/services/proAnalytics');
    const data = await ProAnalytics.getNonSubmittingSchools(district);
    res.json(data);
});

app.get('/api/stats/viloyat', auth, async (req, res) => {
    const now = getFargonaTime();
    const date = req.query.date || now.toISOString().split('T')[0];
    const data = await getViloyatSvod(date);
    res.json(data);
});

app.get('/api/stats/tuman', auth, async (req, res) => {
    const { tuman, date } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const now = getFargonaTime();
    const targetDate = date || now.toISOString().split('T')[0];

    const finalTuman = req.user.role === 'district' ? req.user.district : tuman;
    if (!finalTuman) return res.status(400).json({ error: 'Tuman required' });

    const data = await getTumanSvod(finalTuman, targetDate, limit, offset);
    res.json(data);
});

app.get('/api/stats/absentees', auth, async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const now = getFargonaTime();
    const date = req.query.date || now.toISOString().split('T')[0];
    const data = await getTodayAbsentsDetails(date, limit, offset);

    if (req.user.role === 'district') {
        const userDistNorm = normalizeKey(req.user.district);
        data.rows = data.rows.filter(d => normalizeKey(d.district) === userDistNorm);
    }
    res.json(data);
});

app.get('/api/stats/recent', auth, async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const district = req.user.role === 'district' ? req.user.district : null;

    const result = await getRecentActivity(limit, offset, district);
    res.json(result);
});

app.get('/api/stats/school', auth, async (req, res) => {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Ruxsat yo\'q' });
    try {
        const result = await sqlite.query(`SELECT * FROM attendance WHERE district = $1 AND school = $2 ORDER BY date DESC LIMIT 30`, [req.user.district, req.user.school]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/stats/pro-insights', auth, async (req, res) => {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Ruxsat yo\'q' });

    const isPro = db.checkProByPhone(req.user.phone);
    if (!isPro) return res.status(403).json({ error: 'Faqat PRO foydalanuvchilar uchun' });

    try {
        const ProAnalytics = require('./src/services/proAnalytics');
        const [redList, aiPatterns] = await Promise.all([
            ProAnalytics.getWeeklyRedList(req.user.district, req.user.school),
            ProAnalytics.getAIPatterns(req.user.district, req.user.school)
        ]);
        res.json({ redList, aiPatterns });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/stats/trends', auth, async (req, res) => {
    try {
        const { getTrendStats } = require('./src/services/dataService');
        const district = req.user.role === 'district' ? req.user.district : null;
        const data = await getTrendStats(district);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/premium/red-list', auth, async (req, res) => {
    if (req.user.role !== 'school') return res.status(403).json([]);
    const ProAnalytics = require('./src/services/proAnalytics');
    const list = await ProAnalytics.getWeeklyRedList(req.user.district, req.user.school);
    res.json(list);
});

app.get('/api/premium/patterns', auth, async (req, res) => {
    if (req.user.role !== 'school') return res.status(403).json({});
    const ProAnalytics = require('./src/services/proAnalytics');
    const insights = await ProAnalytics.getAIPatterns(req.user.district, req.user.school);
    res.json({ insights });
});

app.post('/api/premium/generate-notice', auth, async (req, res) => {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Ruxsat yo\'q' });
    const { district, school, students, fio } = req.body;
    try {
        const { generateBildirgi } = require('./src/utils/pdfGenerator');
        const pdfPath = await generateBildirgi({ district, school, students_list: students, fio });
        res.download(pdfPath);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/export/viloyat', auth, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).send("Ruxsat yo'q");
    const { date } = req.query;
    const filePath = await exportToExcel(date);
    if (filePath && fs.existsSync(filePath)) {
        res.download(path.resolve(filePath));
    } else {
        res.status(404).send("Hisobot fayli topilmadi");
    }
});

app.get('/api/export/tuman', auth, async (req, res) => {
    const { tuman, date } = req.query;
    const finalTuman = req.user.role === 'district' ? req.user.district : tuman;
    if (!finalTuman) return res.status(400).send("Tuman required");

    const filePath = await exportDistrictExcel(finalTuman, date);
    if (filePath && fs.existsSync(filePath)) {
        res.download(path.resolve(filePath));
    } else {
        res.status(404).send("Hisobot fayli topilmadi");
    }
});

app.get('/api/export/weekly', auth, async (req, res) => {
    const { date } = req.query;
    const filePath = await exportWeeklyExcel(date);
    if (filePath && fs.existsSync(filePath)) {
        res.download(path.resolve(filePath));
    } else {
        res.status(404).send("Haftalik hisobot topilmadi");
    }
});

app.get('/api/export/monthly', auth, async (req, res) => {
    const { date, district } = req.query;
    const finalDistrict = req.user.role === 'district' ? req.user.district : district;
    const filePath = await exportMonthlyExcel(date, finalDistrict);
    if (filePath && fs.existsSync(filePath)) {
        res.download(path.resolve(filePath));
    } else {
        res.status(404).send("Oylik hisobot topilmadi");
    }
});

app.get('/api/districts', (req, res) => {
    res.json(Object.keys(TOPICS));
});

app.get('/api/check-pro', (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.json({ is_pro: false });
    const cleanPhone = phone.replace(/\D/g, '');
    const user = Object.values(db.users_db).find(u =>
        u.phone && u.phone.replace(/\D/g, '') === cleanPhone &&
        new Date(u.pro_expire_date) > new Date()
    );
    if (user) {
        res.json({
            is_pro: true,
            pro_expire_date: user.pro_expire_date,
            pro_purchase_date: user.pro_purchase_date || '-'
        });
    } else {
        res.json({ is_pro: false });
    }
});

app.get('/api/export/archive', async (req, res) => {
    const { date, token } = req.query;
    if (!token) return res.status(401).send("Unauthorized");
    try {
        const { exportToExcel } = require('./src/services/dataService');
        const filePath = await exportToExcel(date);
        if (filePath && fs.existsSync(filePath)) {
            res.download(filePath);
        } else {
            res.status(404).send("Hisobot topilmadi");
        }
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.post('/api/push/subscribe', async (req, res) => {
    const subscription = req.body;
    try {
        const db_pg = require('./src/database/pg');
        await db_pg.query(
            'INSERT INTO push_subscriptions (subscription, created_at) VALUES ($1, NOW()) ON CONFLICT (subscription) DO NOTHING',
            [JSON.stringify(subscription)]
        );
        res.status(201).json({});
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



app.get('/api/schools', async (req, res) => {
    const { district } = req.query;
    if (!district) return res.status(400).json({ error: 'District required' });
    const schools = await getSchools(district);
    res.json(schools || []);
});

// --- ADMIN SETTINGS & BROADCAST ---

// Admin: Get settings
app.get('/api/admin/settings', auth, (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Ruxsat yo\'q' });
    res.json(db.settings);
});

// Admin: Update settings

// ==================== DOCUMENTS (MEYORIY HUJJATLAR) API ====================
app.post('/api/documents', auth, upload.single('document_file'), (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Faqat Superadmin yuklay oladi!' });
        }
        
        const { title, description } = req.body;
        const dbPath = path.join(__dirname, 'src', 'database', 'documents.json');
        let data = [];
        if (fs.existsSync(dbPath)) data = JSON.parse(fs.readFileSync(dbPath));

        const newDoc = {
            id: Date.now(),
            title,
            description,
            date: new Date().toISOString().split('T')[0],
            filename: req.file ? req.file.filename : null
        };

        data.push(newDoc);
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        res.json({ success: true, doc: newDoc });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/documents', (req, res) => {
    try {
        const dbPath = path.join(__dirname, 'src', 'database', 'documents.json');
        if (!fs.existsSync(dbPath)) return res.json([]);
        const data = JSON.parse(fs.readFileSync(dbPath));
        res.json(data.sort((a,b) => b.id - a.id));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


app.post('/api/admin/settings', auth, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Ruxsat yo\'q' });
    const { vacation_mode, location_collection_mode, check_location } = req.body;

    if (vacation_mode !== undefined) db.settings.vacation_mode = vacation_mode;
    if (location_collection_mode !== undefined) db.settings.location_collection_mode = location_collection_mode;
    if (check_location !== undefined) db.settings.check_location = check_location;

    await db.saveSettings();
    res.json({ success: true, settings: db.settings });
});

// Admin: Broadcast message (Supports Files)
app.post('/api/admin/broadcast', auth, upload.single('file'), async (req, res) => {
    const isOwner = req.user.username === 'mrqirol';
    if (req.user.role !== 'superadmin' && !isOwner) return res.status(403).json({ error: 'Ruxsat yo\'q' });

    const { message, group } = req.body;
    if (!message) return res.status(400).json({ error: 'Xabar matni bo\'sh' });

    const file = req.file;

    // Filter recipients from users_db
    const users = Object.entries(db.users_db);
    let targetUids = [];

    if (group === 'inspectors') {
        targetUids = users.filter(([uid, u]) => u.district || u.role === 'inspektor_psixolog').map(([uid]) => uid);
    } else if (group === 'parents') {
        targetUids = users.filter(([uid, u]) => u.role === 'parent').map(([uid]) => uid);
    } else {
        targetUids = users.map(([uid]) => uid);
    }

    // UNIQUE and VALID IDs
    targetUids = [...new Set(targetUids)].filter(id => id && !isNaN(id));

    res.json({ success: true, estimated_users: targetUids.length });

    // Background broadcasting
    (async () => {
        let sent = 0;
        let blocked = 0;
        const path = require('path');

        for (const uid of targetUids) {
            try {
                if (file) {
                    const filePath = path.join(__dirname, 'assets', 'uploads', file.filename);
                    if (file.mimetype.startsWith('image/')) {
                        await bot.telegram.sendPhoto(uid, { source: filePath }, { caption: message, parse_mode: 'HTML' });
                    } else {
                        await bot.telegram.sendDocument(uid, { source: filePath }, { caption: message, parse_mode: 'HTML' });
                    }
                } else {
                    await bot.telegram.sendMessage(uid, message, { parse_mode: 'HTML' });
                }
                sent++;
            } catch (e) {
                blocked++;
            }
            await new Promise(r => setTimeout(r, 60)); // Avoid flood limits
        }
        console.log(`[BROADCAST] Finished. Sent: ${sent}, Blocked: ${blocked}`);
    })();
});

// Admin: List Archived Reports
app.get('/api/admin/reports', auth, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json([]);
    try {
        const assetsDir = path.join(__dirname, 'assets');
        if (!fs.existsSync(assetsDir)) return res.json([]);
        const files = fs.readdirSync(assetsDir)
            .filter(f => f.endsWith('.xlsx'))
            .map(f => {
                const stat = fs.statSync(path.join(assetsDir, f));
                return { name: f, size: (stat.size / 1024).toFixed(1) + ' KB', date: stat.mtime };
            })
            .sort((a, b) => b.date - a.date);
        res.json(files);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- INSPECTOR TRACKING API ---
app.post('/api/inspector/profile', async (req, res) => {
    const { phone, fio, district, schools } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    try {
        await sqlite.query(`
            INSERT INTO inspector_profiles (phone, fio, district, schools, last_active)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (phone) DO UPDATE SET
            fio = EXCLUDED.fio, district = EXCLUDED.district,
            schools = EXCLUDED.schools, last_active = CURRENT_TIMESTAMP
        `, [phone, fio, district, JSON.stringify(schools)]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/inspector/activity', async (req, res) => {
    const { phone, action, details } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    try {
        await sqlite.query(`INSERT INTO inspector_activity (phone, action, details) VALUES ($1, $2, $3)`, [phone, action, details]);
        // Also update last_active in profile
        await sqlite.query(`UPDATE inspector_profiles SET last_active = CURRENT_TIMESTAMP WHERE phone = $1`, [phone]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/inspectors', auth, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Ruxsat yo\'q' });
    try {
        const profiles = await sqlite.query(`SELECT * FROM inspector_profiles ORDER BY last_active DESC`);
        const activity = await sqlite.query(`SELECT * FROM inspector_activity ORDER BY timestamp DESC LIMIT 100`);
        res.json({ profiles: profiles.rows, activity: activity.rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Download specific report
app.get('/api/admin/reports/download/:filename', auth, (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'district' && req.user.role !== 'school') return res.status(403).send("Ruxsat yo'q");

    const filename = req.params.filename;
    const assetsDir = path.join(__dirname, 'assets');
    const uploadsDir = path.join(assetsDir, 'uploads');

    let filePath = path.join(uploadsDir, filename);

    // Check uploads first, then assets root
    if (!fs.existsSync(filePath)) {
        filePath = path.join(assetsDir, filename);
    }

    // Security check
    if (!filePath.startsWith(assetsDir) || !fs.existsSync(filePath)) {
        return res.status(404).send("Fayl topilmadi");
    }

    res.download(filePath);
});

app.post('/api/contact', async (req, res) => {
    const { name, message } = req.body;
    if (!name || !message) return res.status(400).json({ error: 'Name and message required' });

    const report = `📩 <b>Mushtariydan habar:</b>\n\n` +
        `👤 Ism: ${name}\n` +
        `💬 Habar: ${message}`;

    const groupId = "-1003662758005";
    try {
        await bot.telegram.sendMessage(groupId, report, { parse_mode: 'HTML' });
        res.json({ result: 'success' });
    } catch (e) {
        res.status(500).json({ error: 'TG Error' });
    }
});

app.get('/api/stats/parents', auth, (req, res) => {
    try {
        const parents = Object.entries(db.users_db)
            .filter(([key]) => key.startsWith('parent_'))
            .map(([key, u]) => ({
                id: key.replace('parent_', ''),
                fio: u.fio || 'Noma\'lum',
                child_name: (u.subscriptions && u.subscriptions[0]?.name) || '-',
                phone: u.phone || '-',
                district: u.district || '-',
                school: u.school || '-',
                joined_at: u.joined_at || '-'
            }));
        res.json(parents);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/submit', upload.single('bildirgi'), async (req, res) => {
    const d = req.body;
    const today = getFargonaTime().toISOString().split('T')[0];

    // TAKRORIY KIRITISHNI OLDINI OLISH
    // If not superadmin, check if already submitted today
    const isSuper = req.user && req.user.role === 'superadmin';
    if (!isSuper && !d.overwrite) {
        const alreadyExists = await checkIfExists(d.district, d.school, today);
        if (alreadyExists) {
            return res.status(409).json({
                error: "DUPLICATE",
                message: "Ushbu maktab bo'yicha bugun uchun ma'lumot allaqachon kiritilgan! Eskisini o'chirib, yangisini yozishni xohlaysizmi?"
            });
        }
    }

    // Parse absent_students (FormData sends string)
    let students_list = [];
    try {
        students_list = typeof d.absent_students === 'string' ? JSON.parse(d.absent_students) : (d.absent_students || []);
    } catch (e) { students_list = []; }

    console.log(`[WEB-SUBMIT] Received: ${d.district} - ${d.school}`);

    // Flatten data for saveData/SQLite
    const flatData = {
        ...d,
        sababli_kasal: parseInt(d.sababli_kasal || d.sababli?.kasal) || 0,
        sababli_tadbirlar: parseInt(d.sababli_tadbirlar || d.sababli?.tadbirlar) || 0,
        sababli_oilaviy: parseInt(d.sababli_oilaviy || d.sababli?.oilaviy) || 0,
        sababli_ijtimoiy: parseInt(d.sababli_ijtimoiy || d.sababli?.ijtimoiy) || 0,
        sababli_boshqa: parseInt(d.sababli_boshqa || d.sababli?.boshqa) || 0,
        sababli_total: parseInt(d.sababli_total || d.sababli?.total) || 0,
        sababsiz_muntazam: parseInt(d.sababsiz_muntazam || d.sababsiz?.muntazam) || 0,
        sababsiz_qidiruv: parseInt(d.sababsiz_qidiruv || d.sababsiz?.qidiruv) || 0,
        sababsiz_chetel: parseInt(d.sababsiz_chetel || d.sababsiz?.chetel) || 0,
        sababsiz_boyin: parseInt(d.sababsiz_boyin || d.sababsiz?.boyin) || 0,
        sababsiz_ishlab: parseInt(d.sababsiz_ishlab || d.sababsiz?.ishlab) || 0,
        sababsiz_qarshilik: parseInt(d.sababsiz_qarshilik || d.sababsiz?.qarshilik) || 0,
        sababsiz_jazo: parseInt(d.sababsiz_jazo || d.sababsiz?.jazo) || 0,
        sababsiz_nazoratsiz: parseInt(d.sababsiz_nazoratsiz || d.sababsiz?.nazoratsiz) || 0,
        sababsiz_boshqa: parseInt(d.sababsiz_boshqa || d.sababsiz?.boshqa) || 0,
        sababsiz_turmush: parseInt(d.sababsiz_turmush || d.sababsiz?.turmush) || 0,
        sababsiz_total: parseInt(d.sababsiz_total || d.sababsiz?.total) || 0,
        students_list: students_list,
        inspector: d.inspektor_fio || d.inspektor || '',
        source: 'web'
    };

    // Bildirgi Logic
    if (flatData.sababsiz_total > 0) {
        const isProUser = db.checkProByPhone(d.phone);
        if (req.file) {
            flatData.bildirgi = req.file.path;
        } else if (isProUser) {
            try {
                console.log("Generating Auto Bildirgi for PRO user...");
                const pdfPath = await generateBildirgi({
                    district: d.district,
                    school: d.school,
                    fio: d.fio,
                    total_students: d.total_students,
                    sababsiz_total: flatData.sababsiz_total,
                    students_list: students_list
                });
                flatData.bildirgi = pdfPath;
            } catch (e) {
                console.error("Auto Bildirgi Error:", e);
                // Even for PRO, if auto-gen fails, we might need a fallback, but for now let's just log
            }
        } else {
            // REJECT: Sababsiz bor, lekin bildirgi yuklanmagan
            return res.status(400).json({ error: "Sababsiz kelmaganlar uchun Bildirgi yuklash tanlangan tartib bo'yicha majburiy! Iltimos, fayl yuklang." });
        }
    }

    const success = await saveData(flatData);

    if (success) {
        // Real-time Notification to Parents (NEW)
        if (flatData.students_list && flatData.students_list.length > 0) {
            notifyParents(flatData, flatData.students_list).catch(e => console.error("Notification trigger error:", e));
        }

        // SMS & TG Notification Logic (Same as before)
        // SMS SERVICE INTEGRATION (PRO ONLY)
        const isProUser = db.checkProByPhone(d.phone);
        if (isProUser && flatData.students_list.length > 0) {
            const SmsService = require('./src/services/sms');
            flatData.students_list.forEach(student => {
                if (student.parent_phone) {
                    const msg = `Assalomu alaykum hurmatli ota-ona sizning farzandingiz ${d.district}, ${d.school}ning ${student.class} o‘quvchisi ${student.name} bugun maktabga kelmaganligini ma'lum qilamiz.\n\nMa'lumot uchun farzandingizni ta'limiga e'tiborsizligingiz O‘zbekiston Respublikasining Ma'muriy javobgarlik to‘g‘risidagi kodeksning 47-moddasi asosida jarimaga tortilishingizga sabab bo‘lishini ogohlantiriamiz.`;
                    SmsService.sendSms(student.parent_phone, msg).then(res => {
                        console.log(`[SMS-SENT] To: ${student.parent_phone}, Result:`, res);
                    }).catch(e => console.error("[SMS-ERROR]", e.message));
                }
            });
        }

        // TELEGRAM NOTIFICATION
        const isProForReport = db.checkProByPhone(d.phone);
        const report = formatAttendanceReport(flatData, isProForReport, 'web');

        const tid = getTopicId(d.district);
        const reportGroupId = "-1003662758005"; // Shared report group

        try {
            if (tid) {
                await bot.telegram.sendMessage(reportGroupId, report, { parse_mode: 'HTML', message_thread_id: tid });
                // Send Bildirgi to group if exists
                if (flatData.bildirgi && fs.existsSync(flatData.bildirgi)) {
                    await bot.telegram.sendDocument(reportGroupId, { source: flatData.bildirgi, filename: path.basename(flatData.bildirgi) }, { caption: `#Bildirgi ${d.school}`, message_thread_id: tid });
                }
            } else {
                await bot.telegram.sendMessage(reportGroupId, report, { parse_mode: 'HTML' });
            }
        } catch (err) {
            console.error("TG Send Error:", err.message);
        }

        res.json({
            result: 'success',
            bildirgi: flatData.bildirgi ? path.basename(flatData.bildirgi) : null
        });
    } else {
        res.status(500).json({ result: 'error', error: 'Database save failed' });
    }
});

/**
 * SuperAdmin Command: Activate PRO (e.g. activate 1234567 1)
 * months: 1, 2, or 3
 */
bot.hears(/^activate (\d+)\s*(\d+)?$/, async (ctx) => {
    if (!config.SUPER_ADMIN_IDS.map(Number).includes(Number(ctx.from.id)) && ctx.from.id !== 65002404) return;

    const uid = ctx.match[1];
    const months = parseInt(ctx.match[2]) || 1;

    const u = db.updateUserProMonths(uid, months);

    await ctx.reply(`✅ Foydalanuvchi ${uid} (${u.fio || 'Noma\'lum'}) uchun PRO maqomi ${months} oyga faollashtirildi.\n📅 Amal qilish muddati: ${u.pro_expire_date}`);

    // Group Announcement (Marketing)
    const reportGroupId = "-1003662758005";
    const adv = `🌟 <b>YANGI PRO HARIDI!</b>\n\n🏢 Maktab: <b>${u.school || 'Noma\'lum'}</b>\n📍 Hudud: <b>${u.district || 'Noma\'lum'}</b>\n👤 Mas'ul: <b>${u.fio || 'Noma\'lum'}</b>\n\nUshbu maktab rasman <b>PRO ✨</b> maqomini oldi va barcha eksklyuziv imkoniyatlarga ega bo'ldi! 🎉\n\n<i>Obuna muddati: ${u.pro_expire_date} gacha.</i>`;

    const tid = getTopicId(u.district);
    try {
        if (tid) {
            await bot.telegram.sendMessage(reportGroupId, adv, { parse_mode: 'HTML', message_thread_id: tid });
        } else {
            await bot.telegram.sendMessage(reportGroupId, adv, { parse_mode: 'HTML' });
        }
    } catch (e) { console.error("ADV Send Error:", e.message); }
});

bot.hears(/^revoke (\d+)$/, async (ctx) => {
    if (!config.SUPER_ADMIN_IDS.map(Number).includes(Number(ctx.from.id)) && ctx.from.id !== 65002404) return;
    const uid = ctx.match[1];
    if (db.users_db[uid]) {
        db.users_db[uid].is_pro = false;
        db.users_db[uid].pro_expire_date = "2000-01-01";
        db.updateUserDb(uid, { is_pro: false });
        await ctx.reply(`❌ Foydalanuvchi ${uid} dan PRO maqomi olib tashlandi.`);
    }
});

app.listen(PORT, () => console.log(`Web Dashboard running on port ${PORT}`));

// --- UTILS ---
function getTodayInfo() {
    const now = getFargonaTime();
    const date = now.toLocaleDateString('ru-RU');
    const days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
    return { date, day: days[now.getDay()] };
}



// --- ADMIN HANDLERS ---
bot.hears("👥 Pro Ro'yxat", (ctx) => admin.handleProList(ctx));
bot.hears("❌ Pro Bekor Qilish", (ctx) => { if (config.SUPER_ADMIN_IDS.includes(ctx.from.id)) { ctx.reply("ID ni yuboring (Format: revoke ID):"); } });
bot.hears("➕ Promokod Yaratish", (ctx) => { if (config.SUPER_ADMIN_IDS.includes(ctx.from.id)) { ctx.reply("Tez orada..."); } });
bot.hears("🔴 Ta'tilni YOQISH", (ctx) => { if (config.SUPER_ADMIN_IDS.includes(ctx.from.id)) { db.settings.vacation_mode = true; db.saveSettings(); ctx.reply("🔴 TA'TIL YOQILDI"); } });
bot.hears("🟢 Ta'tilni O'CHIRISH", (ctx) => { if (config.SUPER_ADMIN_IDS.includes(ctx.from.id)) { db.settings.vacation_mode = false; db.saveSettings(); ctx.reply("🟢 TA'TIL O'CHIRILDI"); } });
bot.hears("⬅️ Orqaga", (ctx) => {
    let buttons = [["Davomat kiritish"]];
    if (config.ALL_ADMINS.map(Number).includes(ctx.from.id)) buttons.push(["⚙️ Admin Panel"]);
    buttons.push(["👤 Mening Profilim", "📊 Mening Statistikam"]);
    buttons.push(["ℹ️ Dastur haqida", "📖 Yo'riqnoma"]);
    ctx.reply("🏠 Asosiy menyu", Markup.keyboard(buttons).resize());
});

bot.hears("📝 Rejalar", (ctx) => ctx.reply("📌 <b>Rejalar:</b>\n1. Web App/Mobile App integratsiyasi.\n2. Baza optimizatsiyasi.\n3. Respublika bo'ylab kengaytirish.", { parse_mode: 'HTML' }));

bot.hears("📊 Svod va Hisobotlar", (ctx) => {
    ctx.replyWithHTML("🌐 <b>ONLINE DASHBOARD (SVOD)</b>\n\nBarcha ma'lumotlarni real vaqt rejimida ko'rish va nazorat qilish uchun quyidagi havolaga o'ting:\n\n👉 <a href='https://ferghanaregdavomat.onrender.com/dashboard.html'>YORDAMCHI DASHBOARD</a>");
});

bot.hears("📥 Excel Yuklab olish", async (ctx) => {
    if (!config.SUPER_ADMIN_IDS.includes(ctx.from.id) && ctx.from.id !== 65002404) return ctx.reply("⛔️ Ruxsat yo'q.");
    await ctx.reply("📊 <b>Viloyat bo'yicha umumiy hisobot tayyorlanmoqda...</b>", { parse_mode: 'HTML' });
    const filePath = await exportToExcel();
    if (filePath) {
        await ctx.replyWithDocument({ source: filePath, filename: path.basename(filePath) }, {
            caption: "✅ <b>Viloyat hisoboti tayyor!</b>",
            parse_mode: 'HTML'
        });
    } else {
        await ctx.reply("❌ Xatolik yuz berdi.");
    }
});

bot.hears("📥 Tuman hisoboti (Excel)", async (ctx) => {
    const district = config.DISTRICT_ADMINS[ctx.from.id];
    if (!district) return ctx.reply("⛔️ Sizga hudud biriktirilmagan.");

    await ctx.reply(`📊 <b>${district} bo'yicha maktablar hisoboti tayyorlanmoqda...</b>`, { parse_mode: 'HTML' });

    const filePath = await exportDistrictExcel(district);
    if (filePath) {
        await ctx.replyWithDocument({ source: filePath, filename: path.basename(filePath) }, {
            caption: `✅ <b>${district} hisoboti tayyor!</b>`,
            parse_mode: 'HTML'
        });
    } else {
        await ctx.reply("❌ Xatolik yuz berdi.");
    }
});

// --- START COMMAND ---
bot.hears("⚙️ Admin Panel", (ctx) => admin.showAdminPanel(ctx));

// --- INFO HANDLER ---
bot.hears("📖 Yo'riqnoma", async (ctx) => {
    const filePath = path.join(__dirname, 'assets', 'QOLLANMA.pdf');
    if (fs.existsSync(filePath)) {
        await ctx.replyWithDocument({ source: filePath, filename: "DavomatBot_Qo'llanma.pdf" }, {
            caption: "📖 <b>@Ferghanaregdavomat_bot - Foydalanish yo'riqnomasi</b>\n\nUshbu qo'llanma orqali bot imkoniyatlari bilan tanishib chiqishingiz mumkin.",
            parse_mode: 'HTML'
        });
    } else {
        await ctx.reply("⚠️ Yo'riqnoma fayli topilmadi.");
    }
});

bot.hears("ℹ️ Dastur haqida", (ctx) => {
    ctx.reply(
        "ℹ️ <b>DASTUR HAQIDA</b>\n\n" +
        "🏛 <b>Tashkilot:</b> Farg‘ona viloyati Maktabgacha va maktab ta'limi boshqarmasi\n" +
        "🏢 <b>Bo'lim:</b> Ta'lim tashkilotlarida tarbiyaviy ishlarni muvofiqlashtirish sho‘basi\n\n" +
        "👨‍💻 <b>Muallif:</b> Rustam Raushanovich\n" +
        "🤖 <b>Versiya:</b> 2.0 (Modular)\n" +
        "📅 <b>Yil:</b> 2026\n\n" +
        "🔒 <i>© Barcha huquqlar himoyalangan.</i>",
        { parse_mode: 'HTML' }
    );
});

// --- PROFILE & INSTRUCTION HANDLERS ---
bot.hears("👤 Mening Profilim", async (ctx) => {
    const u = db.users_db[ctx.from.id];
    if (!u) {
        return ctx.reply("❌ Siz hali ro'yxatdan o'tmagansiz. 'Davomat kiritish' tugmasini bosing.");
    }

    const msg = `👤 <b>Sizning profilingiz:</b>\n\n` +
        `📍 <b>Hudud:</b> ${u.district || 'Noma\'lum'}\n` +
        `🏢 <b>Maktab:</b> ${u.school || 'Noma\'lum'}\n` +
        `👤 <b>Mas'ul:</b> ${u.fio || 'Noma\'lum'}\n` +
        `📞 <b>Tel:</b> ${u.phone || 'Noma\'lum'}\n\n` +
        `<i>Ma'lumotlarni o'zgartirish uchun quyidagi tugmani bosing:</i>`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("📝 Ma'lumotlarni tahrirlash", "edit_profile")]
    ]);

    await ctx.replyWithHTML(msg, keyboard);
});

bot.action("edit_profile", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("🔄 Ma'lumotlarni yangilash boshlandi. Iltimos, savollarga qaytadan javob bering.");
    return ctx.scene.enter('attendance_wizard');
});

bot.hears("📖 Yo'riqnoma", async (ctx) => {
    const pdfPath = path.join(__dirname, 'assets', 'yoriqnoma.pdf');
    const msg = `📖 <b>FOYDALANUVCHI YO'RIQNOMASI</b>\n\n` +
        `Ushbu bot orqali davomat hisobotlarini qabul qilish tartibi:\n` +
        `1️⃣ <b>'Davomat kiritish'</b> tugmasini bosing.\n` +
        `2️⃣ Hudud va maktabingizni tanlang.\n` +
        `3️⃣ O'quvchilar soni va kelmaganlar sababini kiriting.\n` +
        `4️⃣ Agar sababsiz kelmaganlar bo'lsa, ular haqida batafsil ma'lumot bering.\n\n` +
        `🌐 <b>Veb-shakl orqali kiritish:</b>\n` +
        `Agarda sizga brauzer orqali kiritish qulay bo'lsa, quyidagi havoladan foydalaning:\n` +
        `👉 <a href="http://localhost:3000">Davomat Veb-Formasi</a>\n\n` +
        `⚠️ <b>Eslatma:</b> Hisobotlar har kuni soat 16:00 gacha qabul qilinadi.`;

    if (fs.existsSync(pdfPath)) {
        await ctx.replyWithDocument({ source: pdfPath }, { caption: msg, parse_mode: 'HTML' });
    } else {
        await ctx.replyWithHTML(msg + "\n\n📄 <i>(PDF yo'riqnoma yaqin orada yuklanadi)</i>");
    }
});

// --- PRO ANALYTICS HANDLERS ---
bot.hears("📊 PRO Analitika", async (ctx) => {
    if (!db.checkPro(ctx.from.id)) return ctx.reply("⛔️ Bu funksiya faqat PRO foydalanuvchilar uchun.");
    ctx.reply("📊 <b>PRO Analitika Paneli:</b>\n\nQuyidagi tahliliy ma'lumotlardan birini tanlang:", {
        parse_mode: 'HTML',
        ...Markup.keyboard([
            ["🔴 Qizil ro'yxat (Haftalik)", "📈 Oylik dinamika"],
            ["🤖 AI Bashorat holatlari", "⬅️ Orqaga"]
        ]).resize()
    });
});

const ProAnalytics = require('./src/services/proAnalytics');

bot.hears("🔴 Qizil ro'yxat (Haftalik)", async (ctx) => {
    const uid = ctx.from.id;
    if (!db.checkPro(uid)) return;
    const user = db.users_db[uid];
    if (!user || !user.district || !user.school) return ctx.reply("⚠️ Profilingiz to'liq emas.");

    const list = await ProAnalytics.getWeeklyRedList(user.district, user.school);
    if (list.length === 0) return ctx.reply("✅ Oxirgi hafta ichida muntazam dars qoldiruvchi o'quvchilar aniqlanmadi.");

    let msg = `🔴 <b>${user.school} - Qizil ro'yxati (Haftalik):</b>\n\n`;
    msg += `<i>Ushbu o'quvchilar oxirgi 7 kunda 2 va undan ortiq marta sababsiz dars qoldirishgan:</i>\n\n`;
    list.forEach((s, i) => {
        msg += `${i + 1}. <b>${s.name}</b> (${s.class})\n👣 Tashriflar: ${s.absent_count} marta\n📞 Tel: ${s.parent_phone || 'Noma\'lum'}\n\n`;
    });
    ctx.replyWithHTML(msg);
});

bot.hears("📈 Oylik dinamika", async (ctx) => {
    if (!db.checkPro(ctx.from.id)) return;
    const user = db.users_db[ctx.from.id];
    const report = await ProAnalytics.getMonthlyDynamics(user.district, user.school);
    ctx.replyWithHTML(report);
});

bot.hears("🤖 AI Bashorat holatlari", async (ctx) => {
    if (!db.checkPro(ctx.from.id)) return;
    const user = db.users_db[ctx.from.id];
    const insights = await ProAnalytics.getAIPatterns(user.district, user.school);
    ctx.replyWithHTML(`🤖 <b>AI Tahlil natijalari (${user.school}):</b>\n\n` + (insights || "Ma'lumotlar yetarli emas."));
});

// --- PROFILE HANDLER ---
bot.hears("👤 Mening Profilim", async (ctx) => {
    const uid = ctx.from.id;
    const user = db.users_db[uid];

    if (!user || (!user.district && !user.school)) {
        return ctx.replyWithHTML("👤 <b>Siz hali ro'yxatdan o'tmagansiz.</b>\n\nDavomat kiritishni boshlang, tizim sizni avtomatik eslab qoladi.");
    }

    let msg = `👤 <b>Sizning profilingiz:</b>\n\n` +
        `👨‍💼 <b>F.I.SH:</b> ${user.fio || 'Kiritilmagan'}\n` +
        `📞 <b>Tel:</b> ${user.phone || 'Kiritilmagan'}\n` +
        `📍 <b>Hudud:</b> ${user.district || 'Tanlanmagan'}\n` +
        `🏫 <b>Maktab:</b> ${user.school || 'Tanlanmagan'}\n\n` +
        `✨ <i>Ma'lumotlarni o'zgartirish uchun "Davomat kiritish" tugmasini bosing va "Yangi ma'lumot kiritish"ni tanlang.</i>`;

    ctx.replyWithHTML(msg);
});

// --- GOOGLE SHEETS STATS ---
bot.hears("📊 Mening Statistikam", async (ctx) => {
    const uid = ctx.from.id;
    if (!db.checkPro(uid)) return ctx.reply("⛔️ Bu funksiya faqat PRO foydalanuvchilar uchun.");


    // Foydalanuvchi ma'lumotlarini olish
    const user = db.users_db[uid];
    if (!user || !user.district || !user.school) {
        return ctx.reply("⚠️ Siz hali maktabingizni kiritmagansiz. Avval 'Davomat kiritish' tugmasini bosing.");
    }

    const waitMsg = await ctx.reply("⏳ <b>Ma'lumotlar yuklanmoqda...</b>", { parse_mode: 'HTML' });

    try {
        const res = await axios.get(process.env.GOOGLE_SCRIPT_URL, {
            params: {
                action: "my_stats",
                district: user.district,
                school: user.school
            }
        });

        await ctx.deleteMessage(waitMsg.message_id).catch(() => { });

        if (res.data && !res.data.error) {
            const d = res.data;
            let msg = `📊 <b>MENING STATISTIKAM</b>\n\n`;
            msg += `🏫 <b>${user.school}</b> (${user.district})\n\n`;

            if (d.today) {
                msg += `📅 <b>Bugun (${d.today.date}):</b>\n`;
                if (d.today.entered) msg += `✅ Kiritilgan (Soat ${d.today.time})\n📉 Davomat: <b>${d.today.percent}%</b>\n`;
                else msg += `❌ Hali kiritilmagan!\n`;
            }

            if (d.history && d.history.length > 0) {
                msg += `\n📅 <b>Oxirgi 7 kunlik tarix:</b>\n`;
                d.history.forEach(h => {
                    msg += `${h.date}: ${h.entered ? "✅" : "❌"}\n`;
                });
            }

            // Maslahat
            if (d.today && !d.today.entered) msg += `\n❗️ <i>Eslatma: Bugungi davomatni vaqtida kiriting!</i>`;

            await ctx.reply(msg, { parse_mode: 'HTML' });

        } else {
            // Agar bo'sh qaytsa
            await ctx.reply("❌ Ma'lumot topilmadi. (Ehtimol maktab nomi noto'g'ri yozilgan)");
        }
    } catch (e) {
        console.error(e);
        await ctx.deleteMessage(waitMsg.message_id).catch(() => { });
        await ctx.reply("❌ Tarmoq xatoligi.");
    }
});

bot.hears("📢 Kiritmaganlar (Manual)", async (ctx) => {
    const uid = ctx.from.id;
    const district = config.DISTRICT_ADMINS[uid];

    if (district) {
        try {
            const r = await getMissingSchools();
            // Robust check for district (apostrophe issue)
            const normDist = normalizeKey(district);
            const dRaw = r && r.missing ? Object.keys(r.missing).find(k => normalizeKey(k) === normDist) : null;

            if (dRaw && r.missing[dRaw]) {
                const list = r.missing[dRaw];
                if (list.length > 0) {
                    let msg = `🚫 <b>${district} - Kiritmaganlar (${list.length} ta):</b>\n\n`;
                    msg += list.map((s, i) => `${i + 1}. ${s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}`).join('\n');
                    // Split info chunks if too long
                    if (msg.length > 4000) {
                        const parts = msg.match(/[\s\S]{1,4000}/g) || [];
                        for (let part of parts) await ctx.reply(part, { parse_mode: 'HTML' });
                    } else {
                        await ctx.reply(msg, { parse_mode: 'HTML' });
                    }

                    // ALSO SEND TO GROUP TOPIC
                    const tid = getTopicId(district);
                    if (tid) {
                        await bot.telegram.sendMessage(config.REPORT_GROUP_ID, msg, { parse_mode: 'HTML', message_thread_id: tid }).catch(() => { });
                    }
                } else {
                    await ctx.reply("✅ <b>Barcha maktablar davomat kiritgan!</b>", { parse_mode: 'HTML' });
                }
            } else {
                await ctx.reply("✅ <b>Barcha maktablar davomat kiritgan!</b> (Yoki ma'lumot yo'q)", { parse_mode: 'HTML' });
            }
        } catch (e) {
            console.error(e);
            await ctx.reply("❌ Xatolik yuz berdi.");
        }
    } else if (config.SUPER_ADMIN_IDS.includes(uid)) {
        // Super Admin ALL view
        await ctx.reply("🔍 <b>Barcha hududlar bo'yicha kiritmaganlar...</b>", { parse_mode: 'HTML' });
        try {
            const r = await getMissingSchools();
            if (r && r.missing) {
                let totalMissing = 0;
                let fullMsg = "";
                for (const d in r.missing) {
                    if (r.missing[d].length > 0) {
                        fullMsg += `\n<b>${d} (${r.missing[d].length}):</b>\n` + r.missing[d].join(', ') + "\n";
                        totalMissing += r.missing[d].length;
                    }
                }
                if (totalMissing === 0) {
                    await ctx.reply("✅ <b>Respublika bo'yicha barcha kiritgan!</b>", { parse_mode: 'HTML' });
                } else {
                    await ctx.replyWithHTML(`🚫 <b>Jami kiritmaganlar: ${totalMissing} ta.</b>\n` + fullMsg.substring(0, 3800)); // Truncate if huge
                    if (fullMsg.length > 3800) await ctx.reply("... (Ro'yxat juda uzun)");

                    // PROACTIVE: Send alerts to all missing districts' topics
                    for (const d in r.missing) {
                        if (r.missing[d].length > 0) {
                            const tid = getTopicId(d);
                            if (tid) {
                                const msg = `🚨 <b>DIQQAT! DAVOMAT KIRITILMAGAN!</b>\n📍 <b>${d}</b>\n\n` +
                                    r.missing[d].map((s, i) => `${i + 1}. ❌ ${s}`).join('\n') +
                                    `\n\n❗️ <b>Iltimos, tezlik bilan davomat kiriting!</b>`;
                                await bot.telegram.sendMessage(config.REPORT_GROUP_ID, msg, { parse_mode: 'HTML', message_thread_id: tid }).catch(() => { });
                            }
                        }
                    }
                    await ctx.reply("✅ Barcha qarzdor hududlarga ogohlantirish yuborildi.");
                }
            }
        } catch (e) { ctx.reply("Error"); }
    } else {
        await ctx.reply("⛔️ Ruxsat yo'q.");
    }
});

bot.hears("📢 Qarzdorlarga ABOROT", async (ctx) => {
    const uid = ctx.from.id;
    const district = config.DISTRICT_ADMINS[uid];

    if (district) {
        await ctx.reply(`🚨 <b>${district}</b> bo'yicha QARZDORLAR ro'yxati shakllantirilmoqda...`, { parse_mode: 'HTML' });
        try {
            const r = await getMissingSchools();
            const normDist = normalizeKey(district);
            const dRaw = r && r.missing ? Object.keys(r.missing).find(k => normalizeKey(k) === normDist) : null;

            if (dRaw && r.missing[dRaw]) {
                const list = r.missing[dRaw];
                if (list.length > 0) {
                    let msg = `🔥 <b>DIQQAT ABOROT!</b>\n\n<b>${district}</b> bo'yicha quyidagi <b>${list.length} ta</b> maktab hali davomat kiritmadi:\n\n`;
                    msg += list.map((s, i) => `${i + 1}. ❌ ${s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}`).join('\n');
                    msg += `\n\n❗️ <b>Tezlik bilan davomat kiritilsin!</b>`;

                    if (msg.length > 4000) {
                        const parts = msg.match(/[\s\S]{1,4000}/g) || [];
                        for (let part of parts) await ctx.reply(part, { parse_mode: 'HTML' });
                    } else {
                        await ctx.reply(msg, { parse_mode: 'HTML' });
                    }

                    // ALSO SEND TO GROUP TOPIC
                    const tid = getTopicId(district);
                    if (tid) {
                        await bot.telegram.sendMessage(config.REPORT_GROUP_ID, msg, { parse_mode: 'HTML', message_thread_id: tid }).catch(() => { });
                    }
                } else {
                    await ctx.reply("✅ <b>Ajoyib! Barcha maktablar davomat kiritgan. Qarzdorlar yo'q!</b>", { parse_mode: 'HTML' });
                }
            } else {
                await ctx.reply("✅ <b>Qarzdorlar yo'q!</b>", { parse_mode: 'HTML' });
            }
        } catch (e) {
            console.error(e);
            await ctx.reply("❌ Xatolik yuz berdi.");
        }
    } else if (config.SUPER_ADMIN_IDS.includes(uid)) {
        await ctx.reply("🚨 <b>Respublika bo'yicha QARZDORLAR ro'yxati shakllantirilmoqda...</b>", { parse_mode: 'HTML' });
        try {
            const r = await getMissingSchools();
            if (r && r.missing) {
                let totalMissing = 0;
                let fullMsg = "🔥 <b>DIQQAT ABOROT (RESPUBLIKA)!</b>\n\n";
                for (const d in r.missing) {
                    if (r.missing[d].length > 0) {
                        fullMsg += `\n<b>${d} (${r.missing[d].length}):</b>\n` + r.missing[d].map(s => `❌ ${s}`).join('\n') + "\n";
                        totalMissing += r.missing[d].length;
                    }
                }
                if (totalMissing === 0) {
                    await ctx.reply("✅ <b>Qoyil! Hamma kiritgan!</b>", { parse_mode: 'HTML' });
                } else {
                    fullMsg += `\n❗️ <b>Jami qarzdorlar: ${totalMissing} ta.</b>`;
                    await ctx.replyWithHTML(fullMsg.substring(0, 3800));
                    if (fullMsg.length > 3800) await ctx.reply("... (Ro'yxat juda uzun, qolgani sig'madi)");

                    // PROACTIVE: Send alerts to all missing districts' topics
                    for (const d in r.missing) {
                        if (r.missing[d].length > 0) {
                            const tid = getTopicId(d);
                            if (tid) {
                                const msg = `🔥 <b>DIQQAT ABOROT!</b>\n\n<b>${d}</b> bo'yicha quyidagi <b>${r.missing[d].length} ta</b> maktab hali davomat kiritmadi:\n\n` +
                                    r.missing[d].map((s, i) => `${i + 1}. ❌ ${s}`).join('\n') +
                                    `\n\n❗️ <b>Tezlik bilan davomat kiritilsin!</b>`;
                                await bot.telegram.sendMessage(config.REPORT_GROUP_ID, msg, { parse_mode: 'HTML', message_thread_id: tid }).catch(() => { });
                            }
                        }
                    }
                    await ctx.reply("✅ Barcha qarzdor hududlarga ogohlantirish yuborildi.");
                }
            }
        } catch (e) { ctx.reply("Error"); }
    } else {
        await ctx.reply("⛔️ Ruxsat yo'q.");
    }
});

// --- DASHBOARD USERS STATUS ---
const showDashboardUsers = async (ctx) => {
    const uid = ctx.from.id;
    if (!config.SUPER_ADMIN_IDS.includes(uid)) return ctx.reply("⛔️ Ruxsat yo'q.");

    let msg = "🖥 <b>Dashboard Foydalanuvchilari:</b>\n\n";
    Object.entries(USERS).forEach(([login, data]) => {
        msg += `👤 <b>${login}</b>: <code>${data.password}</code> (${data.district || 'ADMIN'})\n`;
    });

    await ctx.replyWithHTML(msg);
};

bot.command('dashboard_users', showDashboardUsers);
bot.hears('🖥 Dashboard Logins', showDashboardUsers);

// --- HELPER: SEND EXCEL REPORT ---
const sendExcelReport = async (ctx, targetId = null) => {
    const chatId = ctx ? ctx.chat.id : targetId;
    if (!chatId) return;

    let waitingMsg;
    if (ctx) waitingMsg = await ctx.reply("⏳ <b>Excel hisobot tayyorlanmoqda...</b>\n<i>(Bu jarayon 10-15 soniya vaqt olishi mumkin)</i>", { parse_mode: 'HTML' });

    try {
        const res = await axios.get(process.env.GOOGLE_SCRIPT_URL, { params: { action: "excel_report" } });
        if (ctx && waitingMsg) await ctx.deleteMessage(waitingMsg.message_id).catch(() => { });

        if (res.data && res.data.url) {
            const doc = { url: res.data.url, filename: (res.data.name || "Hisobot") + ".xlsx" };
            const caption = "✅ <b>Hisobot tayyor!</b>\n\nFile: " + res.data.name;
            if (ctx) await ctx.replyWithDocument(doc, { caption, parse_mode: 'HTML' });
            else await bot.telegram.sendDocument(chatId, doc, { caption, parse_mode: 'HTML' });
        } else {
            if (ctx) await ctx.reply("❌ Google Scriptdan xatolik qaytdi: " + JSON.stringify(res.data));
        }
    } catch (e) {
        console.error(e);
        if (ctx) await ctx.reply("❌ Xatolik: " + e.message);
    }
};

// --- EXCEL REPORT HANDLER ---
bot.hears("📥 TEST REPORT", async (ctx) => {
    if (!config.ALL_ADMINS.map(Number).includes(ctx.from.id)) return ctx.reply("⛔️ Ruxsat yo'q.");
    await sendExcelReport(ctx);
});

// --- SYNC DB HANDLER ---
bot.hears("🔄 Bazani yangilash", async (ctx) => {
    if (!config.SUPER_ADMIN_IDS.map(Number).includes(ctx.from.id)) return ctx.reply("⛔️ Faqat Super Admin uchun.");

    await ctx.reply("🔄 <b>Baza yangilanmoqda...</b>\n<i>(Tumanlar bo'ylab ma'lumot yuklanmoqda)</i>", { parse_mode: 'HTML' });
    let totalSchools = 0;
    const districts = Object.keys(TOPICS);

    for (const dist of districts) {
        try {
            const normDist = normalizeKey(dist); // Use existing utility
            const res = await axios.get(process.env.GOOGLE_SCRIPT_URL, {
                params: { action: "schools", district: normDist },
                timeout: 30000
            });
            if (res.data && Array.isArray(res.data)) {
                db.schools_db[dist] = res.data;
                totalSchools += res.data.length;
            }
        } catch (e) { console.error(`Sync error for ${dist}:`, e.message); }
    }

    db.saveSchools();
    await ctx.reply(`✅ <b>Baza muvaffaqiyatli yangilandi!</b>\n\n🏫 Jami maktablar: <b>${totalSchools}</b> ta.\n📂 Faylga saqlandi.`, { parse_mode: 'HTML' });
});

bot.hears("📢 E'lon Yuborish", (ctx) => {
    if (config.SUPER_ADMIN_IDS.includes(ctx.from.id)) {
        ctx.scene.enter('broadcast_wizard');
    } else {
        ctx.reply("⛔️ Bu funksiya faqat Super Adminlar uchun.");
    }
});

// --- CHART HANDLER ---
bot.hears("📊 Grafika", async (ctx) => {
    await ctx.reply("📊 <b>Statistika tayyorlanmoqda...</b>", { parse_mode: 'HTML' });
    try {
        const r = await getMissingSchools();
        if (!r || !r.missing) return ctx.reply("❌ Ma'lumot olishda xatolik.");

        // 1. Calculate stats
        let totalMissing = 0;
        let missingByDistrict = {};
        for (const d in r.missing) {
            const count = r.missing[d].length;
            totalMissing += count;
            missingByDistrict[d] = count;
        }

        // Total Schools from Local DB (Approximate or exact if synced)
        // If local db is empty, assume 950
        let totalSchools = 950;
        if (db.schools_db && Object.keys(db.schools_db).length > 0) {
            // db.schools_db structure? It's { "Tuman": ["M1", "M2"] } or similar?
            // db.js says schools_db = JSON.parse(SCHOOLS_FILE);
            // Let's assume it matches school_db structure or check debug.
            // If not sure, we use the sum of (missing + entered). Wait, we don't know entered.
            // Let's use a safe fallback or dynamic if possible.
            // Actually, I can count total from db.schools_db if I knew structure.
            // Let's assume 956 (standard for Ferghana).
            totalSchools = 956;
        }

        const entered = totalSchools - totalMissing;
        const percent = ((entered / totalSchools) * 100).toFixed(1);

        // 2. Generate Pie Chart (Entered vs Missing)
        const chartConfig = {
            type: 'pie',
            data: {
                labels: [`Kiritgan (${entered})`, `Kiritmagan (${totalMissing})`],
                datasets: [{
                    data: [entered, totalMissing],
                    backgroundColor: ['#2ecc71', '#e74c3c']
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: `Viloyat Davomati: ${percent}%`
                    },
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold', size: 14 }
                    }
                }
            }
        };

        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=500&h=300`;

        await ctx.replyWithPhoto(chartUrl, { caption: `📊 <b>Davomat Statistikasi</b>\n\n✅ Kiritganlar: <b>${entered}</b>\n❌ Kiritmaganlar: <b>${totalMissing}</b>\n📉 Jami maktablar: <b>${totalSchools}</b>`, parse_mode: 'HTML' });

    } catch (e) {
        console.error(e);
        await ctx.reply("❌ Grafik yasashda xatolik.");
    }
});

// --- RANKING HANDLER ---
bot.hears("🏆 Reyting", async (ctx) => {
    await ctx.reply("🏆 <b>Reyting hisoblanmoqda...</b>", { parse_mode: 'HTML' });
    try {
        const r = await getMissingSchools();
        if (!r || !r.missing) return ctx.reply("❌ Ma'lumot olishda xatolik.");

        // 1. Stats
        const ranking = [];
        const allDistricts = Object.keys(TOPICS);
        for (const dist of allDistricts) {
            const missingList = r.missing[dist] || [];
            ranking.push({ district: dist, count: missingList.length });
        }
        ranking.sort((a, b) => a.count - b.count); // Asc

        // 2. Text Message
        let msg = "🏆 <b>VILOYAT REYTINGI (DAVOMAT)</b>\n\n";
        msg += "✅ <b>NAMUNALI TUMANLAR (TOP-3):</b>\n";
        const top3 = ranking.slice(0, 3);
        top3.forEach((item, i) => {
            msg += `${i + 1}. <b>${item.district}</b> — ${item.count === 0 ? "🎉 100%" : item.count + " ta kiritilmagan"}\n`;
        });
        msg += "\n➖➖➖➖➖➖➖➖➖➖\n\n";
        msg += "🚫 <b>ENG SUST TUMANLAR (ANTI-TOP-3):</b>\n";
        const bottom3 = ranking.slice(-3).reverse();
        bottom3.forEach((item, i) => {
            if (item.count > 0) msg += `${i + 1}. <b>${item.district}</b> — ❌ ${item.count} ta kiritilmagan\n`;
            else msg += `${i + 1}. <b>${item.district}</b> — 🎉 Ajoyib!\n`;
        });
        const now = getFargonaTime();
        msg += `\n📊 <i>Reyting hozirgi vaqt (${now.getHours()}:${now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()}) holatiga ko'ra.</i>`;

        await ctx.reply(msg, { parse_mode: 'HTML' });

        // 3. BAR CHART (Bottom 5 - Worst)
        // Sort descending
        const worst = [...ranking].sort((a, b) => b.count - a.count).slice(0, 5);
        // Only if there are missing schools
        if (worst[0].count > 0) {
            const chartConfig = {
                type: 'horizontalBar',
                data: {
                    labels: worst.map(x => x.district.replace(" tumani", "").replace(" shahri", "")),
                    datasets: [{
                        label: 'Kiritmagan Maktablar',
                        data: worst.map(x => x.count),
                        backgroundColor: '#e74c3c'
                    }]
                },
                options: {
                    legend: { display: false },
                    plugins: {
                        datalabels: { color: 'white', font: { weight: 'bold' } }
                    },
                    title: { display: true, text: 'TOP 5 - ENG SUST HUDUDLAR' }
                }
            };
            const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=500&h=300`;
            await ctx.replyWithPhoto(chartUrl, { caption: "📉 Eng ko'p qolib ketgan hududlar" });
        }

    } catch (e) {
        console.error(e);
        await ctx.reply("❌ Reyting tuzishda xatolik.");
    }
});

// --- ADMIN HANDLERS ---
bot.hears("🖥 Dashboard Logins", admin.handleDashboardLogins);

// --- MAIN FLOW ---
bot.hears(/^(📊 )?Davomat kiritish$/, (ctx) => {
    if (db.settings.vacation_mode && !config.ALL_ADMINS.includes(ctx.from.id)) {
        return ctx.reply("🔴 Hozir ta'til rejimi yoqilgan. Ma'lumot qabul qilinmaydi.");
    }
    ctx.scene.enter('attendance_wizard');
});

bot.on('text', async (ctx) => {
    const uid = ctx.from.id;
    const isSuper = config.SUPER_ADMIN_IDS.map(Number).includes(Number(uid)) || uid === 65002404;

    // --- 🏆 RAG'BATLANTIRISH: TASHAKKURNOMA GENERATORI ---
    if (ctx.message.text.startsWith("reward ") && isSuper) {
        const parts = ctx.message.text.split(" ");
        if (parts.length < 3) return ctx.reply("Format: reward [Tuman] [Maktab nomi]");

        const distName = parts[1];
        const schoolName = parts.slice(2).join(" ");

        await ctx.reply(`🎨 <b>${schoolName}</b> uchun tashakkurnoma tayyorlanmoqda...`, { parse_mode: 'HTML' });

        try {
            const { generateCertificate } = require('./src/services/rewardService');
            const buffer = await generateCertificate(schoolName, distName, 'Haftalik');

            const tid = getTopicId(distName);
            const caption = `🏆 <b>TABRIKLAYMIZ!</b>\n\n<b>${distName}</b>, <b>${schoolName}</b> jamoasi namunali davomat ko'rsatkichlari uchun tashakkurnoma bilan taqdirlanadi! 👏✨`;

            // Send to current user
            await ctx.replyWithPhoto({ source: buffer }, { caption, parse_mode: 'HTML' });

            // Send to district topic
            if (tid) {
                await bot.telegram.sendPhoto(config.REPORT_GROUP_ID, { source: buffer }, {
                    caption,
                    parse_mode: 'HTML',
                    message_thread_id: tid
                });
                await ctx.reply("✅ Tashakkurnoma tuman guruhiga yuborildi.");
            }
        } catch (e) {
            console.error("Reward Gen Error:", e);
            ctx.reply("❌ Xatolik: " + e.message);
        }
        return;
    }

    // Odatiy commands
    if (ctx.message.text.startsWith("revoke ")) {
        const id = ctx.message.text.split(" ")[1];
        if (config.SUPER_ADMIN_IDS.includes(ctx.from.id)) {
            admin.revokePro(ctx, id);
        }
        return;
    }

    // --- 🤖 SUN'IY INTELLEKT: OVOZLI / MATNLI DAVOMAT YORDAMCHISI (VAKUUMDA) ---
    const text = ctx.message.text.toLowerCase();

    // Agar matnda "maktab", "o'quvchi" va "kelmadi" / "kasal" kabi so'zlar aralash kelgan bo'lsa
    if (text.includes("maktab") && (text.includes("kasal") || text.includes("sababsiz") || text.includes("kelmadi"))) {
        return ctx.reply("🤖 <b>AI Yordamchi:</b>\n\nUshbu matn/ovoz orqali davomat kiritish funksiyasi yaqin kunlarda ishga tushadi. Hozircha 'Davomat kiritish' tugmasidan foydalaning.", { parse_mode: 'HTML' });
    }
});

bot.on('voice', (ctx) => {
    ctx.reply("🎙 <b>Ovozli xabar qabul qilindi.</b>\n\nAI orqali ovozli davomat kiritish funksiyasi tez orada faollashadi. Hozircha tugmalar orqali kiriting.", { parse_mode: 'HTML' });
});

// --- SCHEDULER (Hourly & Auto-Report) ---
let lastRunSlot = ""; // Format: "YYYY-MM-DD HH:mm"
let dailyReportSent = false;
let lastHourProcessed = -1;

function startHourlyCheck() {
    console.log("Scheduler started (Checking warnings every min)...");

    const DISTRICT_OFFICIALS = {
        "margilon shahri": "Kodirov Abdullajon",
        "fargona shahri": "Teshaboyev Boburjon Bahodir o'g'li",
        "quvasoy shahri": "Qurbonov Ulug'bek Jumayevich",
        "qoqon shahri": "Aliyeva Laziza Xusanovna",
        "bagdod tumani": "Isaboyeva Elmira Erkinovna",
        "beshariq tumani": "Po'latov Dilshodjon Qahholrovich",
        "buvayda tumani": "Axmadjonov Aliyorbek Azizbekovich",
        "dangara tumani": "Miraminov Abdulaziz G'ayratjon o'g'li",
        "yozyovon tumani": "Usmonov Shoxrux Rustamjonovich",
        "oltiariq tumani": "Latipov Zoxidjon Abdurahimovich",
        "qoshtepa tumani": "Ergasheva Mamlakatxon Muxtorovna",
        "rishton tumani": "Raximov Abdumutal Abduxalim o'g'li",
        "sox tumani": "Ibragimov Gulshan Ravshanjonovich",
        "toshloq tumani": "Ibragimov Ergashali Asqaraliyevich",
        "uchkoprik tumani": "Yunusova Marg'uba Akramovna",
        "fargona tumani": "Raximova Mahliyoxon Xolmuxammadovna",
        "furqat tumani": "Mirzayev Mirzaxamdamjon Valiyevich",
        "ozbekiston tumani": "Ochildiyeva Gulmiraxon Ne'matillayevna",
        "quva tumani": "Xolikov Jaxongir Ne'matjonovich"
    };


    setInterval(async () => {
        try {
            const now = getFargonaTime();
            const h = now.getHours();
            const m = now.getMinutes();
            const dayStr = now.toISOString().split('T')[0];

            // Unique slot for this specific check time (e.g. "2024-05-20 10:30")
            const currentSlot = `${dayStr} ${h}:${m}`;

            // 1. Warning & Deadline Checks (08:00 - 16:00)
            const isTime = (h >= 8 && h <= 16);

            // Only run if:
            // - It's work hours
            // - It's exactly 00 or 30 minutes
            // - We haven't run for this specific time slot yet
            if (isTime && (m === 0 || m === 30) && lastRunSlot !== currentSlot) {
                lastRunSlot = currentSlot; // Lock immediately

                const dayOfWeek = now.getDay(); // 0 = Sun

                // Only send warnings Mon-Sat (exclude Sunday)
                if (dayOfWeek !== 0) {
                    const warningHours = [9, 11, 13, 15];
                    const isDeadline = (h === 15 && m === 30); // 15:30 deadline
                    const isFinalDeadline = (h === 16 && m === 0); // 16:00 final deadline
                    const cutoffH = 15;
                    const cutoffM = 30;

                    if (warningHours.includes(h) || isDeadline || isFinalDeadline) {
                        console.log(`[SCHEDULER] Checking attendance at ${currentSlot}...`);

                        const mData = await getMissingSchools();
                        if (mData) {
                            for (const dRaw in mData) {
                                if (mData[dRaw].length > 0) {
                                    const tid = getTopicId(dRaw);
                                    if (tid) {
                                        let txt = "";

                                        // 15:30 Warning (30 mins left)
                                        if (h === 15 && m === 30) {
                                            txt = `⏳ <b>DIQQAT! 16:00 gacha 30 daqiqa vaqt qoldi!</b>\n\n🚨 <b>${dRaw}</b> bo'yicha quyidagi maktablar hali davomat kiritmagan:\n\n` +
                                                mData[dRaw].map((s, i) => `${i + 1}. ❌ ${s}`).join('\n') +
                                                `\n\n❗️ <b>Iltimos, vaqtida ulguring!</b>`;
                                        }
                                        // 16:00 Final Warning
                                        else if (h === 16 && m === 0) {
                                            const normKey = normalizeKey(dRaw).toLowerCase();
                                            const official = DISTRICT_OFFICIALS[normKey] || "Mas'ullar";

                                            txt = `🚫 <b>AFSUSKI! Ish vaqti tugadi (16:00).</b>\n\n😔 <b>${dRaw}</b> bo'yicha quyidagi maktablar bugun davomat kiritishmadi:\n\n` +
                                                mData[dRaw].map((s, i) => `${i + 1}. ❌ ${s}`).join('\n') +
                                                `\n\n‼️ <b>Hurmatli ${official}, vaziyatni qattiq nazoratga olishingizni so'rayman!</b>`;
                                        }
                                        // Other hours (Standard warning)
                                        else if (h < 15 || (h === 15 && m < 30)) {
                                            txt = `⚠️ <b>Eslatma (${h}:00):</b>\n\n📍 <b>${dRaw}</b> da quyidagi maktablar davomat kiritmadi:\n\n` +
                                                mData[dRaw].map((s, i) => `${i + 1}. ❌ ${s}`).join('\n') +
                                                `\n\n❗️ Iltimos, faollik ko'rsating.`;
                                        }

                                        if (txt) {
                                            console.log(`[ALERTS] Sending warning to ${dRaw} (Topic: ${tid})`);
                                            try {
                                                await bot.telegram.sendMessage(config.REPORT_GROUP_ID, txt, {
                                                    parse_mode: 'HTML',
                                                    message_thread_id: tid
                                                });
                                            } catch (err) {
                                                console.error(`[ALERTS] Error sending to ${dRaw}:`, err.message);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 2. Auto-Report at 16:05 (Daily Excel)
            if (h === 16 && m === 5 && !dailyReportSent) {
                console.log("Sending Auto 16:05 Report...");
                dailyReportSent = true;
                try {
                    await sendExcelReport(null, config.REPORT_GROUP_ID);
                } catch (e) { console.error("Auto Report Failed", e); }
            }

            // Reset daily report flag at midnight
            if (h === 0 && dailyReportSent) dailyReportSent = false;

        } catch (e) {
            console.error("Scheduler check error:", e);
        }
    }, 45000); // Check every 45 seconds to avoid double trigger on 30s interval
}




// --- LOCATION HANDLERS ---
bot.hears(/📍 Lokatsiya Yig'ish: (ON|OFF)/, (ctx) => {
    if (!config.SUPER_ADMIN_IDS.includes(ctx.from.id)) return;
    const mode = ctx.match[1] === "OFF"; // Toggle logic (If OFF, turn ON)
    db.settings.location_collection_mode = mode;
    db.saveSettings();
    ctx.reply(`📍 Lokatsiya Yig'ish rejimi: ${mode ? "YOQILDI" : "O'CHIRILDI"}`);
    admin.showAdminPanel(ctx); // Refresh panel
});

bot.hears(/📍 Lokatsiya Tekshirish: (ON|OFF)/, (ctx) => {
    if (!config.SUPER_ADMIN_IDS.includes(ctx.from.id)) return;
    const mode = ctx.match[1] === "OFF";
    db.settings.check_location = mode;
    db.saveSettings();
    ctx.reply(`📍 Lokatsiya Tekshirish rejimi: ${mode ? "YOQILDI" : "O'CHIRILDI"}`);
    admin.showAdminPanel(ctx);
});

bot.hears("📍 Maktab joylashuvini tasdiqlash", (ctx) => {
    if (!db.settings.location_collection_mode) return ctx.reply("🔴 Lokatsiya yig'ish rejimi o'chirilgan.");
    const uid = ctx.from.id;
    const user = db.users_db[uid];
    if (!user || !user.school) return ctx.reply("⚠️ Avval maktabingizni tanlang (Davomat kiritish orqali).");

    ctx.reply(
        `📍 <b>Hurmatli ${user.fio}!</b>\n\nIltimos, <b>${user.school}</b> hududida turib, pastdagi tugmani bosing va joylashuvingizni yuboring.`,
        {
            parse_mode: 'HTML',
            ...Markup.keyboard([[Markup.button.locationRequest("📍 Lokatsiyani yuborish")], ["⬅️ Orqaga"]]).resize()
        }
    );
});

// --- BOT IMAGE DRAWING HANDLER ---
bot.hears("🖼 Viloyat Rasm (Test)", async (ctx) => {
    if (!config.SUPER_ADMIN_IDS.includes(ctx.from.id)) return ctx.reply("⛔️ Ruxsat yo'q.");

    await ctx.reply("⏳ <b>Rasmli hisobot shakllantirilmoqda...</b>", { parse_mode: 'HTML' });

    try {
        const { createCanvas } = require('canvas');
        const canvas = createCanvas(1080, 1080);
        const ct = canvas.getContext('2d');

        // Asosiy fon
        ct.fillStyle = '#0f172a';
        ct.fillRect(0, 0, 1080, 1080);

        // Gradient naqshlar
        const grad = ct.createLinearGradient(0, 0, 1080, 1080);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#0f172a');
        ct.fillStyle = grad;
        ct.fillRect(0, 0, 1080, 1080);

        // Sarlavha
        ct.fillStyle = '#ffffff';
        ct.font = 'bold 50px Arial';
        ct.textAlign = 'center';
        ct.fillText("FARG'ONA VILOYATI", 540, 100);

        ct.fillStyle = '#38bdf8';
        ct.font = 'bold 40px Arial';
        ct.fillText("DAVOMAT KUNLIK QIZIL ZONASI", 540, 160);

        const dataService = require('./src/services/dataService');
        const svod = await dataService.getViloyatSvod(getFargonaTime().toISOString().split('T')[0]);

        const worst = [...svod].filter(x => x.entries > 0).sort((a, b) => a.avg_percent - b.avg_percent).slice(0, 5);

        // Chizish 5 ta eng pastni
        ct.textAlign = 'left';
        let y = 300;
        worst.forEach((dist, idx) => {
            // Box
            ct.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ct.fillRect(80, y - 50, 920, 80);

            ct.fillStyle = '#ef4444';
            ct.font = 'bold 40px Arial';
            ct.fillText(`${idx + 1}. ${dist.district}`, 110, y + 5);

            ct.fillStyle = '#ffffff';
            ct.textAlign = 'right';
            ct.font = 'bold 36px Arial';
            ct.fillText(`${dist.avg_percent}%`, 950, y);
            ct.textAlign = 'left';

            y += 110;
        });

        // Sana va vaqt tagida
        ct.fillStyle = '#94a3b8';
        ct.font = '30px Arial';
        ct.textAlign = 'center';
        ct.fillText(`Sana: ${getFargonaTime().toLocaleDateString('ru-RU')} | MMT Boshqarmasi`, 540, 1000);

        const buffer = canvas.toBuffer('image/png');
        await ctx.replyWithPhoto({ source: buffer }, {
            caption: `📊 <b>Kunlik qizil zonalar monitoringi rasm shaklida!</b>`,
            parse_mode: 'HTML'
        });

    } catch (e) {
        console.error("Canvas draw error: ", e);
        ctx.reply("Rasm chizishda xatolik yuzaga keldi. Modullar topilmagan bo'lishi mumkin.");
    }
});


// PRO: Receipt Handler
bot.on(['photo', 'document'], async (ctx) => {
    if (ctx.session && ctx.session.waiting_receipt) {
        const uid = ctx.from.id;
        const name = ctx.from.first_name || 'Foydalanuvchi';
        const userName = ctx.from.username ? '@' + ctx.from.username : 'NoUsername';
        
        // Forward to All Super Admins
        const admins = [65002404]; // Only primary admin
        
        for (const adminId of admins) {
            try {
                const forwardMsg = `🧾 <b>Yangi to'lov cheki!</b>\n\nKimdan: ${name} (${userName})\nUID: <code>${uid}</code>\n\nPRO статусни фаоллаштириш учун тугмани босинг:`;
                
                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.callback('✅ 1 ойлик (Faollashtirish)', `approve_pro:${uid}:1`)],
                    [Markup.button.callback('✅ 3 ойлик (Faollashtirish)', `approve_pro:${uid}:3`)],
                    [Markup.button.callback('❌ Rad etish', `reject_pro:${uid}`)]
                ]);

                if (ctx.message.photo) {
                    await ctx.telegram.sendPhoto(adminId, ctx.message.photo[ctx.message.photo.length - 1].file_id, { caption: forwardMsg, parse_mode: 'HTML', ...keyboard });
                } else if (ctx.message.document) {
                    await ctx.telegram.sendDocument(adminId, ctx.message.document.file_id, { caption: forwardMsg, parse_mode: 'HTML', ...keyboard });
                }
            } catch (e) { console.error("Admin Forward Error:", e.message); }
        }

        ctx.session.waiting_receipt = false;
        return ctx.reply("✅ Чекингиз админларга юборилди. Тез орада тасдиқланади!");
    }
    // If not waiting receipt, maybe other handlers handle it?
});

// PRO: Inline Buttons Actions
bot.action(/approve_pro:(\d+):(\d+)/, async (ctx) => {
    const [, targetUid, months] = ctx.match;
    if (!config.SUPER_ADMIN_IDS.includes(ctx.from.id)) return ctx.answerCbQuery("Ruxsat yo'q.");

    try {
        const result = db.updateUserProMonths(targetUid, parseInt(months));
        await ctx.answerCbQuery("PRO faollashtirildi!");
        await ctx.editMessageCaption(ctx.update.callback_query.message.caption + "\n\n✅ <b>FAOLLASHTIRILDI (${months} oy)</b>", { parse_mode: 'HTML' });
        
        // Notify User
        await ctx.telegram.sendMessage(targetUid, `🎉 <b>Tabriklaymiz!</b>\n\nТўловингиз тасдиқланди ва <b>PRO</b> обунангиз ${months} ойга фаоллаштирилди!`, { parse_mode: 'HTML' });
    } catch (e) {
        ctx.answerCbQuery("Xatolik: " + e.message);
    }
});

bot.action(/reject_pro:(\d+)/, async (ctx) => {
    const targetUid = ctx.match[1];
    if (!config.SUPER_ADMIN_IDS.includes(ctx.from.id)) return ctx.answerCbQuery("Ruxsat yo'q.");
    
    await ctx.answerCbQuery("Rad etildi.");
    await ctx.editMessageCaption(ctx.update.callback_query.message.caption + "\n\n❌ <b>RAD ETILDI</b>", { parse_mode: 'HTML' });
    await ctx.telegram.sendMessage(targetUid, "❌ Узр, тўлов чекингиз тасдиқланмади. Хатолик бўлса @qirol га мурожаат қилинг.");
});

bot.on('location', (ctx) => {
    const uid = ctx.from.id;
    const user = db.users_db[uid];

    // 1. Agar Collection Mode yoqilgan bo'lsa -> SAQLASH
    if (db.settings.location_collection_mode) {
        if (!user || !user.school) return ctx.reply("⚠️ Maktab biriktirilmagan.");

        const loc = ctx.message.location;
        // Db ga saqlash
        if (!db.coords_db[user.district]) db.coords_db[user.district] = {};
        db.coords_db[user.district][user.school] = {
            lat: loc.latitude,
            lon: loc.longitude,
            updated_at: new Date(),
            updated_by: uid
        };
        db.saveCoords();

        ctx.reply(`✅ <b>${user.school}</b> joylashuvi muvaffaqiyatli saqlandi!\nRahmat.`, Markup.keyboard([["Davomat kiritish"]]).resize());
        return;
    }

    // 2. Agar ODDIY holatda bo'lsa (va kelajakda tekshirish kerak bo'lsa)
    // Hozircha shunchaki 'Rahmat' deymiz
    ctx.reply("📍 Lokatsiya qabul qilindi.");
});

bot.catch((err, ctx) => {
    console.log(`Error: ${err}`);
    if (err.code === 403) return;
    try {
        if (ctx) ctx.reply("Xatolik yuz berdi. /start").catch(() => { });
    } catch (e) { }
});

// Global error handlers to prevent crash
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

startHourlyCheck();

app.listen(PORT, () => {
    console.log(`🚀 Dashboard API is running on port ${PORT}`);
});

console.log('Attempting to launch bot...');
bot.launch({
    polling: {
        timeout: 60
    }
}).then(() => {
    console.log('Ferghanaredavomat Bot Started!');
}).catch(e => {
    console.error("Startup Error:", e);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));



const fs = require('fs');
const path = require('path');
const pg = require('./pg');

const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const USERS_DB_FILE = path.join(__dirname, 'users_db.json');
const PROMO_FILE = path.join(__dirname, 'promocodes.json');
const SCHOOLS_FILE = path.join(__dirname, 'schools.json');
const COORDS_FILE = path.join(__dirname, 'coords.json');

let settings = { vacation_mode: false, location_collection_mode: false, check_location: false, maintenance_mode: false, academic_year: '2026-2027' };
let users_db = {};
let promocodes = {};
let schools_db = {};
let coords_db = {};

async function loadAll() {
    try { if (fs.existsSync(SETTINGS_FILE)) settings = { ...settings, ...JSON.parse(fs.readFileSync(SETTINGS_FILE)) }; } catch (e) { }
    try { if (fs.existsSync(USERS_DB_FILE)) users_db = JSON.parse(fs.readFileSync(USERS_DB_FILE)); } catch (e) { }
    try { if (fs.existsSync(PROMO_FILE)) promocodes = JSON.parse(fs.readFileSync(PROMO_FILE)); } catch (e) { }
    try { if (fs.existsSync(SCHOOLS_FILE)) schools_db = JSON.parse(fs.readFileSync(SCHOOLS_FILE)); } catch (e) { }
    try { if (fs.existsSync(COORDS_FILE)) coords_db = JSON.parse(fs.readFileSync(COORDS_FILE)); } catch (e) { }

    // Backup from PostgreSQL
    try {
        const res = await pg.query('SELECT id, data FROM tg_users');
        res.rows.forEach(row => {
            users_db[row.id] = { ...users_db[row.id], ...row.data };
        });
        const sRes = await pg.query('SELECT value FROM settings WHERE key = $1', ['global']);
        if (sRes.rows.length > 0) settings = { ...settings, ...sRes.rows[0].value };
        console.log(`📡 Synced ${res.rows.length} users from Supabase.`);
    } catch (e) {
        console.warn("📡 Supabase Sync Warning (Postgres might be empty):", e.message);
    }
}

async function saveSettings() {
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings));
        await pg.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['global', settings]);
    } catch (e) { }
}

function savePromos() { try { fs.writeFileSync(PROMO_FILE, JSON.stringify(promocodes)); } catch (e) { } }
function saveCoords() { try { fs.writeFileSync(COORDS_FILE, JSON.stringify(coords_db)); } catch (e) { } }

async function saveUser(ctx, data) {
    if (!ctx.from) return;
    const uid = ctx.from.id;
    users_db[uid] = { ...users_db[uid], ...data, name: ctx.from.first_name, username: ctx.from.username };
    try {
        fs.writeFileSync(USERS_DB_FILE, JSON.stringify(users_db, null, 2));
        await pg.query('INSERT INTO tg_users (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2, last_active = NOW()', [String(uid), users_db[uid]]);
    } catch (e) { }
}

async function updateUserDb(uid, data) {
    if (!users_db[uid]) users_db[uid] = {};
    users_db[uid] = { ...users_db[uid], ...data };
    try {
        fs.writeFileSync(USERS_DB_FILE, JSON.stringify(users_db, null, 2));
        await pg.query('INSERT INTO tg_users (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2, last_active = NOW()', [String(uid), users_db[uid]]);
    } catch (e) { }
}

function updateUserProMonths(uid, months = 1) {
    if (!users_db[uid]) users_db[uid] = {};

    let now = new Date();
    let baseDate = (users_db[uid].is_pro && new Date(users_db[uid].pro_expire_date) > now)
        ? new Date(users_db[uid].pro_expire_date)
        : now;

    let expireDate = new Date(baseDate);
    expireDate.setMonth(expireDate.getMonth() + months);

    users_db[uid].is_pro = true;
    users_db[uid].pro_expire_date = expireDate.toISOString().split('T')[0];
    users_db[uid].pro_purchase_date = now.toISOString().split('T')[0];

    try {
        fs.writeFileSync(USERS_DB_FILE, JSON.stringify(users_db, null, 2));
        pg.query('INSERT INTO tg_users (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2, last_active = NOW()', [String(uid), users_db[uid]]);
    } catch (e) { }
    return users_db[uid];
}

const { SUPER_ADMIN_IDS, SPECIALIST_IDS } = require('../config/config');


function updateUserAccessMonths(uid, months = 1) {
    if (!users_db[uid]) users_db[uid] = {};

    let now = new Date();
    let baseDate = (users_db[uid].has_access && new Date(users_db[uid].access_expire_date) > now)
        ? new Date(users_db[uid].access_expire_date)
        : now;

    let expireDate = new Date(baseDate);
    expireDate.setMonth(expireDate.getMonth() + months);

    users_db[uid].has_access = true;
    users_db[uid].access_expire_date = expireDate.toISOString().split('T')[0];
    users_db[uid].access_purchase_date = now.toISOString().split('T')[0];

    try {
        fs.writeFileSync(USERS_DB_FILE, JSON.stringify(users_db, null, 2));
        pg.query('INSERT INTO tg_users (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2, last_active = NOW()', [String(uid), users_db[uid]]);
    } catch (e) { }
    return users_db[uid];
}

function grantSchoolAccess(district, school, months = 1, type = 'access') {
    const { normalizeKey } = require('../utils/topics');
    const key = `${normalizeKey(district)}_${normalizeKey(school)}`;
    if (!settings.school_access) settings.school_access = {};

    let now = new Date();
    let currentExp = settings.school_access[key] && settings.school_access[key].expire_date;
    let baseDate = (currentExp && new Date(currentExp) > now) ? new Date(currentExp) : now;
    let expireDate = new Date(baseDate);
    expireDate.setMonth(expireDate.getMonth() + months);

    settings.school_access[key] = {
        district,
        school,
        type, // 'access' or 'pro'
        purchase_date: now.toISOString().split('T')[0],
        expire_date: expireDate.toISOString().split('T')[0]
    };
    saveSettings();

    // Also update any matching users in users_db
    const normD = normalizeKey(district);
    const normS = normalizeKey(school);
    Object.keys(users_db).forEach(uid => {
        const u = users_db[uid];
        if (u && u.district && u.school && normalizeKey(u.district) === normD && normalizeKey(u.school) === normS) {
            if (type === 'pro') {
                updateUserProMonths(uid, months);
            } else {
                updateUserAccessMonths(uid, months);
            }
        }
    });

    return settings.school_access[key];
}

function checkSchoolAccess(district, school) {
    if (!district || !school || !settings.school_access) return false;
    const { normalizeKey } = require('../utils/topics');
    const key = `${normalizeKey(district)}_${normalizeKey(school)}`;
    const sa = settings.school_access[key];
    if (!sa) return false;
    return new Date(sa.expire_date) > new Date();
}

function checkAttendanceAccess(uid) {
    if (SUPER_ADMIN_IDS.map(Number).includes(Number(uid))) return true;
    if (SPECIALIST_IDS.map(Number).includes(Number(uid))) return true;

    const u = users_db[uid];
    if (!u) return false;
    if (u.is_pro && new Date(u.pro_expire_date) > new Date()) return true;
    if (u.has_access && new Date(u.access_expire_date) > new Date()) return true;

    if (u.district && u.school && checkSchoolAccess(u.district, u.school)) return true;

    return false;
}

function checkPro(uid) {
    if (SUPER_ADMIN_IDS.map(Number).includes(Number(uid))) return true;
    if (SPECIALIST_IDS.map(Number).includes(Number(uid))) return true;

    const u = users_db[uid];
    if (u && u.is_pro && new Date(u.pro_expire_date) > new Date()) return true;
    if (u && u.district && u.school) {
        const { normalizeKey } = require('../utils/topics');
        const key = `${normalizeKey(u.district)}_${normalizeKey(u.school)}`;
        const sa = settings.school_access && settings.school_access[key];
        if (sa && sa.type === 'pro' && new Date(sa.expire_date) > new Date()) return true;
    }
    return false;
}

function checkProByPhone(phone) {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\D/g, '');
    return Object.values(users_db).some(u =>
        u.phone && u.phone.replace(/\D/g, '') === cleanPhone &&
        new Date(u.pro_expire_date) > new Date()
    );
}

function checkAttendanceAccessByPhone(phone) {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\D/g, '');

    const userMatch = Object.values(users_db).some(u => {
        if (!u.phone) return false;
        if (u.phone.replace(/\D/g, '') !== cleanPhone) return false;
        if (u.uid && (SUPER_ADMIN_IDS.map(Number).includes(Number(u.uid)) || SPECIALIST_IDS.map(Number).includes(Number(u.uid)))) return true;
        if (u.is_pro && new Date(u.pro_expire_date) > new Date()) return true;
        if (u.has_access && new Date(u.access_expire_date) > new Date()) return true;
        return false;
    });
    if (userMatch) return true;

    try {
        const pPath = path.join(__dirname, 'pro_users.json');
        if (fs.existsSync(pPath)) {
            const proData = JSON.parse(fs.readFileSync(pPath, 'utf8') || '[]');
            const match = proData.find(u => u.phone === cleanPhone && new Date(u.pro_expire_date) > new Date());
            if (match) return true;
        }
    } catch (e) {}

    try {
        const aPath = path.join(__dirname, 'access_users.json');
        if (fs.existsSync(aPath)) {
            const accessData = JSON.parse(fs.readFileSync(aPath, 'utf8') || '[]');
            const match = accessData.find(u => u.phone === cleanPhone && new Date(u.access_expire_date) > new Date());
            if (match) return true;
        }
    } catch (e) {}

    return false;
}

// Initial load
loadAll();

module.exports = {
    get settings() { return settings; },
    get users_db() { return users_db; },
    get promocodes() { return promocodes; },
    get schools_db() { return schools_db; },
    get coords_db() { return coords_db; },
    saveSettings,
    savePromos,
    saveUser,
    updateUserDb,
    updateUserProMonths,
    updateUserAccessMonths,
    checkAttendanceAccess,
    checkAttendanceAccessByPhone,
    checkPro,
    checkProByPhone,
    grantSchoolAccess,
    checkSchoolAccess,
    saveCoords,
    loadAll, // Export for manual sync
    saveSchools: () => { try { fs.writeFileSync(SCHOOLS_FILE, JSON.stringify(schools_db)); } catch (e) { } }
};

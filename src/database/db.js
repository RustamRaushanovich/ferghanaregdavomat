const fs = require('fs');
const path = require('path');
const pg = require('./pg');

const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const USERS_DB_FILE = path.join(__dirname, 'users_db.json');
const PROMO_FILE = path.join(__dirname, 'promocodes.json');
const SCHOOLS_FILE = path.join(__dirname, 'schools.json');
const COORDS_FILE = path.join(__dirname, 'coords.json');

let settings = { vacation_mode: false, location_collection_mode: false, check_location: false };
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

function checkPro(uid) {
    if (SUPER_ADMIN_IDS.map(Number).includes(Number(uid))) return true;
    if (SPECIALIST_IDS.map(Number).includes(Number(uid))) return true;

    const u = users_db[uid];
    return u && u.is_pro && new Date(u.pro_expire_date) > new Date();
}

function checkProByPhone(phone) {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\D/g, '');
    return Object.values(users_db).some(u =>
        u.phone && u.phone.replace(/\D/g, '') === cleanPhone &&
        new Date(u.pro_expire_date) > new Date()
    );
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
    checkPro,
    checkProByPhone,
    saveCoords,
    loadAll, // Export for manual sync
    saveSchools: () => { try { fs.writeFileSync(SCHOOLS_FILE, JSON.stringify(schools_db)); } catch (e) { } }
};

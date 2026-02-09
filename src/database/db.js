const fs = require('fs');
const path = require('path');

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

function loadAll() {
    try { if (fs.existsSync(SETTINGS_FILE)) settings = { ...settings, ...JSON.parse(fs.readFileSync(SETTINGS_FILE)) }; } catch (e) { }
    try { if (fs.existsSync(USERS_DB_FILE)) users_db = JSON.parse(fs.readFileSync(USERS_DB_FILE)); } catch (e) { }
    try { if (fs.existsSync(PROMO_FILE)) promocodes = JSON.parse(fs.readFileSync(PROMO_FILE)); } catch (e) { }
    try { if (fs.existsSync(SCHOOLS_FILE)) schools_db = JSON.parse(fs.readFileSync(SCHOOLS_FILE)); } catch (e) { }
    try { if (fs.existsSync(COORDS_FILE)) coords_db = JSON.parse(fs.readFileSync(COORDS_FILE)); } catch (e) { }
}

function saveSettings() { try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings)); } catch (e) { } }
function savePromos() { try { fs.writeFileSync(PROMO_FILE, JSON.stringify(promocodes)); } catch (e) { } }
function saveCoords() { try { fs.writeFileSync(COORDS_FILE, JSON.stringify(coords_db)); } catch (e) { } }

function saveUser(ctx, data) {
    if (!ctx.from) return;
    const uid = ctx.from.id;
    users_db[uid] = { ...users_db[uid], ...data, name: ctx.from.first_name, username: ctx.from.username };
    try { fs.writeFileSync(USERS_DB_FILE, JSON.stringify(users_db, null, 2)); } catch (e) { }
}
function updateUserDb(uid, data) {
    if (!users_db[uid]) return;
    users_db[uid] = { ...users_db[uid], ...data };
    try { fs.writeFileSync(USERS_DB_FILE, JSON.stringify(users_db, null, 2)); } catch (e) { }
}
function updateUserPro(uid, days) {
    if (!users_db[uid]) users_db[uid] = {};
    let baseDate = (users_db[uid].is_pro && new Date(users_db[uid].pro_expire_date) > new Date()) ? new Date(users_db[uid].pro_expire_date) : new Date();
    const expire = new Date(baseDate.setDate(baseDate.getDate() + days));
    users_db[uid].is_pro = true;
    users_db[uid].pro_expire_date = expire.toISOString().split('T')[0];
    try { fs.writeFileSync(USERS_DB_FILE, JSON.stringify(users_db, null, 2)); } catch (e) { }
}
const { SUPER_ADMIN_IDS, SPECIALIST_IDS } = require('../config/config');

function checkPro(uid) {
    if (SUPER_ADMIN_IDS.map(Number).includes(Number(uid))) return true;
    if (SPECIALIST_IDS.map(Number).includes(Number(uid))) return true;

    const u = users_db[uid];
    return u && u.is_pro && new Date(u.pro_expire_date) > new Date();
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
    updateUserPro,
    checkPro,
    saveCoords,
    saveSchools: () => { try { fs.writeFileSync(SCHOOLS_FILE, JSON.stringify(schools_db)); } catch (e) { } }
};

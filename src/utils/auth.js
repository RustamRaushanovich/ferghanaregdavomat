const fs = require('fs');
const path = require('path');
const pg = require('../database/pg');
const topicsConfig = require('../config/topics');
const TOPICS = topicsConfig.getTopics();

const DB_PATH = path.join(__dirname, '../../src/database/dashboard_users.json');
const TOKENS_PATH = path.join(__dirname, '../../src/database/tokens.json');

const sanitizeLogin = (name) => {
    return name.toLowerCase()
        .replace(/‘|’|'|`/g, '')
        .replace(/ shahri/g, 'sh')
        .replace(/ tumani/g, 't')
        .replace(/\s+/g, '');
};

const USERS = {};

async function loadUsers() {
    // 1. Seed defaults
    const seedUsers = {
        "mrqirol": { password: "2323", role: "superadmin", district: null },
        "VMMTB": { password: "1234", role: "admin", district: null }
    };

    Object.keys(TOPICS).forEach(d => {
        if (d === "Test rejimi" || d === "MMT Boshqarma") return;
        const login = sanitizeLogin(d);
        seedUsers[login] = { password: "123", role: "district", district: d };
    });

    // 2. Clear current
    for (const key in USERS) delete USERS[key];
    Object.assign(USERS, seedUsers);

    // 3. Try to load from Supabase for overrides (like password changes)
    try {
        const res = await pg.query('SELECT login, data FROM dashboard_users');
        res.rows.forEach(row => {
            USERS[row.login] = { ...USERS[row.login], ...row.data };
        });
        console.log(`🔑 Loaded ${res.rows.length} dashboard users overrides from Supabase.`);
    } catch (e) {
        console.warn("🔑 Dashboard users table might not exist yet, using seeds.");
    }
}

async function saveUsers() {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(USERS, null, 2));
    } catch (e) { }
    // Persist to Supabase
    try {
        for (const [login, data] of Object.entries(USERS)) {
            await pg.query('INSERT INTO dashboard_users (login, data) VALUES ($1, $2) ON CONFLICT (login) DO UPDATE SET data = $2', [login, data]);
        }
    } catch (e) {
        console.error("🔑 Save Users to Supabase Error:", e.message);
    }
}

// Global start
loadUsers();

const tokens = new Map();

function loadTokens() {
    try {
        if (fs.existsSync(TOKENS_PATH)) {
            const raw = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8') || '{}');
            for (const [t, u] of Object.entries(raw)) {
                tokens.set(t, u);
            }
            console.log(`🔑 ${tokens.size} ta avtorizatsiya tokenlari yuklandi.`);
        }
    } catch (e) {
        console.warn("Tokens load error:", e.message);
    }
}

function saveTokens() {
    try {
        const obj = {};
        for (const [t, u] of tokens.entries()) {
            obj[t] = u;
        }
        fs.writeFileSync(TOKENS_PATH, JSON.stringify(obj, null, 2));
    } catch (e) {
        console.warn("Tokens save error:", e.message);
    }
}

loadTokens();

function generateToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

module.exports = {
    USERS,
    tokens,
    generateToken,
    saveTokens,
    loadTokens,
    sanitizeLogin,
    saveUsers,
    loadUsers
};

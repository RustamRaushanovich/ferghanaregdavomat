const fs = require('fs');
const path = require('path');
const topicsConfig = require('../config/topics');
const TOPICS = topicsConfig.getTopics();

const DB_PATH = path.join(__dirname, '../../src/database/dashboard_users.json');

const sanitizeLogin = (name) => {
    return name.toLowerCase()
        .replace(/‘|’|'|`/g, '')
        .replace(/ shahri/g, 'sh')
        .replace(/ tumani/g, 't')
        .replace(/\s+/g, '');
};

const USERS = {};

function loadUsers() {
    // MAJBURIY TOZALASH VA FAQAT KERAKLI USERNARNI QO'SHISH
    const seedUsers = {
        "qirol": { password: "2323", role: "superadmin", district: null },
        "abror4400": { password: "1234", role: "superadmin", district: null },
        "viloyat": { password: "1234", role: "superadmin", district: null },
        "VMMTB": { password: "1234", role: "superadmin", district: null }
    };

    // 19 ta tuman/shahar loginlarini qo'shish
    Object.keys(TOPICS).forEach(d => {
        if (d === "Test rejimi" || d === "MMT Boshqarma") return;
        const login = sanitizeLogin(d);
        seedUsers[login] = { password: "123", role: "district", district: d };
    });

    // USERS obyektini tozalab, yangi ro'yxatni yuklaymiz
    for (const key in USERS) delete USERS[key];
    Object.assign(USERS, seedUsers);

    // JSON faylga saqlash (Maktablarni o'chirib yuboradi)
    saveUsers();
}

function saveUsers() {
    fs.writeFileSync(DB_PATH, JSON.stringify(USERS, null, 2));
}

// Dastur ishga tushganda ro'yxatni yangilash
loadUsers();

const tokens = new Map();

function generateToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

module.exports = {
    USERS,
    tokens,
    generateToken,
    sanitizeLogin,
    saveUsers,
    loadUsers
};

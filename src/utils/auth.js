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
    if (fs.existsSync(DB_PATH)) {
        const data = JSON.parse(fs.readFileSync(DB_PATH));
        Object.assign(USERS, data);
    } else {
        // Seed initial data
        USERS["qirol"] = { password: "2323", role: "superadmin", district: null };
        Object.keys(TOPICS).forEach(d => {
            if (d === "Test rejimi" || d === "MMT Boshqarma") return;
            const login = sanitizeLogin(d);
            USERS[login] = { password: "123", role: "district", district: d };
        });
        saveUsers();
    }
}

function saveUsers() {
    fs.writeFileSync(DB_PATH, JSON.stringify(USERS, null, 2));
}

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
    saveUsers // Export to allow saving after pw changes
};

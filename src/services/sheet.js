const axios = require('axios');
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

function normalize(str) {
    if (!str) return "";
    return str.replace(/‘/g, "'").replace(/’/g, "'").replace(/`/g, "'");
}

async function fetchFromSheet(district) {
    try {
        const normDist = normalize(district);
        const res = await axios.get(GOOGLE_SCRIPT_URL, {
            params: { action: "schools", district: normDist },
            timeout: 15000
        });
        if (typeof res.data === 'string' && res.data.includes("<!DOCTYPE html>")) {
            console.error("XATO: Google Script HTML qaytardi (Ruxsatnoma yoki Redirect muammosi).");
            return [];
        }
        if (res.data && Array.isArray(res.data) && res.data.length > 0) return res.data;
        return [];
    } catch (e) {
        console.error("Ulanish xatosi:", e.message);
        return [];
    }
}

// Local maktablar bazasi
let schoolsDB = {};
try {
    schoolsDB = require('../database/schools.json');
} catch (e) { console.error("Schools JSON error:", e); }

// Maktablarni olish (Local - Faster)
async function getSchools(district) {
    const norm = normalize(district);

    // 1. Local bazadan qidirish
    // Shunchaki ikkala variantni ham tekshiramiz va eng uzunini olamiz
    let list1 = schoolsDB[district] || [];
    let list2 = schoolsDB[norm] || [];

    let list = list1.length >= list2.length ? list1 : list2;

    if (list && list.length > 0) return list;

    // 2. Agar localda bo'lmasa, Sheetdan (Zaxira)
    console.log(`${district} uchun local maktab seti topilmadi, Sheetga murojaat qilinmoqda...`);
    let schools = await fetchFromSheet(district);

    if (schools.length > 0) return schools;
    return [];
}

const { getFargonaTime } = require('../utils/fargona');

const { saveAttendance } = require('./dataService');

// Ma'lumotlarni saqlash
async function saveData(data) {
    // 1. Save to SQLite (Main storage now)
    const localSuccess = await saveAttendance(data);
    if (!localSuccess) console.error("Local SQLite save failed, but proceeding to Sheet backup...");

    // 2. Backup to Google Sheet (Legacy)
    try {
        const payload = JSON.parse(JSON.stringify({ ...data, action: "add" }));
        const response = await axios.post(GOOGLE_SCRIPT_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.result === 'success') {
            return true;
        } else {
            console.error("Sheet javobi xato:", response.data);
            return true; // Return true as long as local save worked
        }
    } catch (e) {
        console.error("Sheet backup xatosi:", e.message);
        return localSuccess; // Still return success if local save was OK
    }
}


async function getDistrictStats(district) {
    try {
        const res = await axios.get(GOOGLE_SCRIPT_URL, { params: { action: "stats", district } });
        if (res.data && !res.data.error) return res.data;
        return null;
    } catch (e) {
        return null;
    }
}

async function generatePdf(data) {
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, { action: 'pdf', ...data });
        return res;
    } catch (e) {
        console.error("PDF Error:", e.message);
        return null;
    }
}

async function getMissingSchools() {
    try {
        const res = await axios.get(GOOGLE_SCRIPT_URL, { params: { action: "missing" } });
        return res.data;
    } catch (e) {
        console.error("getMissingSchools Error:", e.message);
        return null;
    }
}

module.exports = { getSchools, saveData, getDistrictStats, generatePdf, getMissingSchools };

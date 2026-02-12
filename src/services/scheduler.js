const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const { getViloyatSvod, exportToExcel, getTumanSvod } = require('./dataService');
const { getFargonaTime } = require('../utils/fargona');
const topicsConfig = require('../config/topics');
const { getTopicId } = require('../utils/topics');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const REPORT_GROUP_ID = process.env.REPORT_GROUP_ID || '-1003662758005';

/**
 * Daily Summary (Svod) at 16:30
 */
async function sendDailySummary() {
    console.log("🕒 [CRON] Starting daily summary at 16:30...");
    const now = getFargonaTime();
    const dateStr = now.toISOString().split('T')[0];

    try {
        // 1. Generate Excel Viloyat
        const filePath = await exportToExcel(dateStr);

        // 2. Get Viloyat Summary Data
        const svod = await getViloyatSvod(dateStr);

        let totalSchools = 0;
        let enteredSchools = 0;
        let vStudents = 0;
        let vAbsents = 0;

        svod.forEach(d => {
            enteredSchools += d.entries;
            vStudents += d.students;
            vAbsents += d.total_absent;
        });

        const vPercent = vStudents > 0 ? ((vStudents - vAbsents) / vStudents * 100).toFixed(1) : 0;

        let msg = `📊 <b>KUNLIK YAKUNIY HISOBOT (SVOD)</b>\n\n`;
        msg += `📅 Sana: <b>${dateStr}</b>\n`;
        msg += `🕒 Vaqt: <b>16:30</b>\n\n`;
        msg += `🏢 Kiritgan maktablar: <b>${enteredSchools} ta</b>\n`;
        msg += `👥 Jami o'quvchilar: <b>${vStudents.toLocaleString()}</b>\n`;
        msg += `📉 Davomat ko'rsatkichi: <b>${vPercent}%</b>\n\n`;
        msg += `👇 Batafsil hududlar kesimida Excel hisobotda:`;

        // Send to Main Topic (MMT Boshqarma or General)
        const mainTopicId = getTopicId("MMT Boshqarma");
        if (filePath) {
            await bot.telegram.sendDocument(REPORT_GROUP_ID, { source: filePath }, {
                caption: msg,
                parse_mode: 'HTML',
                message_thread_id: mainTopicId
            });
            console.log("✅ [CRON] Daily summary sent successfully.");
        }
    } catch (e) {
        console.error("❌ [CRON] Daily summary error:", e);
    }
}

/**
 * Sunday Best Schools Report at 09:00
 */
async function sendWeeklyBestSchools() {
    console.log("🕒 [CRON] Starting weekly best schools report (Sunday 09:00)...");
    const topics = topicsConfig.getTopics();
    const districts = Object.keys(topics).filter(d => d !== "Test rejimi" && d !== "MMT Boshqarma");

    // Last 6 days (Mon-Sat)
    const now = getFargonaTime();
    const dateRange = [];
    for (let i = 1; i <= 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dateRange.push(d.toISOString().split('T')[0]);
    }

    try {
        const db = require('../database/pg');

        for (const distName of districts) {
            const topicId = getTopicId(distName);
            if (!topicId) continue;

            const q = `
                SELECT school, AVG(percent) as avg_p 
                FROM attendance 
                WHERE district = $1 AND date = ANY($2) 
                GROUP BY school 
                ORDER BY avg_p DESC LIMIT 5
            `;
            const res = await db.query(q, [distName, dateRange]);

            if (res.rows.length > 0) {
                let msg = `🏆 <b>HAFTALIK ENG NAMUNALI MAKTABLAR</b> (TOP-5)\n`;
                msg += `📍 Hudud: <b>${distName}</b>\n`;
                msg += `📅 Davr: ${dateRange[dateRange.length - 1]} dan ${dateRange[0]} gacha\n\n`;

                res.rows.forEach((r, i) => {
                    msg += `${getMedal(i + 1)} <b>${r.school}</b> — ${parseFloat(r.avg_p).toFixed(1)}%\n`;
                });

                msg += `\n👏 <i>Tabriklaymiz! Davomatni namunali saqlashda davom eting.</i>`;

                await bot.telegram.sendMessage(REPORT_GROUP_ID, msg, {
                    parse_mode: 'HTML',
                    message_thread_id: topicId
                });
            }
        }
        console.log("✅ [CRON] Weekly best schools report sent.");
    } catch (e) {
        console.error("❌ [CRON] Weekly best schools error:", e);
    }
}

function getMedal(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '🔹';
}

/**
 * Flash Report for SuperAdmin at 16:45
 */
async function sendFlashReport() {
    console.log("🕒 [CRON] Starting flash report at 16:45...");
    const now = getFargonaTime();
    const dateStr = now.toISOString().split('T')[0];

    try {
        const svod = await getViloyatSvod(dateStr);
        if (!svod || svod.length === 0) return;

        // Sort for best and worst
        const sorted = [...svod].sort((a, b) => b.avg_percent - a.avg_percent);
        const top3 = sorted.slice(0, 3);
        const bottom3 = sorted.filter(d => d.entries > 0).slice(-3).reverse();

        let msg = `⚡️ <b>FARG'ONA VILOYATI: KUNLIK TEZKOR HISOBOT</b>\n`;
        msg += `📅 Sana: <b>${dateStr}</b> | 🕒 <b>16:45</b>\n\n`;

        msg += `✅ <b>ENG YAXSHI 3 HUDUD:</b>\n`;
        top3.forEach((d, i) => {
            msg += `${i + 1}. ${d.district} — <b>${parseFloat(d.avg_percent).toFixed(1)}%</b>\n`;
        });

        msg += `\n⚠️ <b>DIQQAT TALAB 3 HUDUD:</b>\n`;
        bottom3.forEach((d, i) => {
            msg += `${i + 1}. ${d.district} — <b>${parseFloat(d.avg_percent).toFixed(1)}%</b>\n`;
        });

        msg += `\n📊 <b>VILOYAT O'RTACHA:</b> <b>${(svod.reduce((acc, curr) => acc + curr.avg_percent, 0) / svod.length).toFixed(1)}%</b>\n`;
        msg += `🏢 Jami maktablar: ${svod.reduce((acc, curr) => acc + curr.entries, 0)} ta`;

        const superAdminIds = [65002404, 786314811];
        for (const sid of superAdminIds) {
            await bot.telegram.sendMessage(sid, msg, { parse_mode: 'HTML' });
        }
        console.log("✅ [CRON] Flash report sent.");
    } catch (e) {
        console.error("❌ [CRON] Flash report error:", e);
    }
}

// Initialize Cron Jobs
function initCrons() {
    // 1. Daily Summary at 16:30 (Monday-Saturday)
    cron.schedule('30 16 * * 1-6', () => {
        sendDailySummary();
    }, { timezone: "Asia/Tashkent" });

    // 2. Flash Report at 16:45 (Monday-Saturday)
    cron.schedule('45 16 * * 1-6', () => {
        sendFlashReport();
    }, { timezone: "Asia/Tashkent" });

    // 3. Weekly Best Schools (Sunday at 09:00)
    cron.schedule('0 9 * * 0', () => {
        sendWeeklyBestSchools();
    }, { timezone: "Asia/Tashkent" });

    console.log("🚀 [Scheduler] Automated reports initialized.");
}

module.exports = { initCrons };

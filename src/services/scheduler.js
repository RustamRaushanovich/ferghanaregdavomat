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

        let enteredSchools = 0;
        let vStudents = 0;
        let vAbsents = 0;

        svod.forEach(d => {
            enteredSchools += d.entries;
            vStudents += d.students;
            vAbsents += d.total_absent;
        });

        const vPercent = vStudents > 0 ? ((vStudents - vAbsents) / vStudents * 100).toFixed(1) : 0;

        let mainMsg = `📊 <b>KUNLIK YAKUNIY HISOBOT (SVOD)</b>\n\n`;
        mainMsg += `📅 Sana: <b>${dateStr}</b>\n`;
        mainMsg += `🕒 Vaqt: <b>16:30</b>\n\n`;
        mainMsg += `🏢 Kiritgan maktablar: <b>${enteredSchools} ta</b>\n`;
        mainMsg += `👥 Jami o'quvchilar: <b>${vStudents.toLocaleString()}</b>\n`;
        mainMsg += `📉 Davomat ko'rsatkichi: <b>${vPercent}%</b>\n\n`;
        mainMsg += `👇 Batafsil hududlar kesimida Excel hisobotda:`;

        // Send to Main Topic (MMT Boshqarma)
        const mainTopicId = getTopicId("MMT Boshqarma");
        if (filePath) {
            await bot.telegram.sendDocument(REPORT_GROUP_ID, { source: filePath }, {
                caption: mainMsg,
                parse_mode: 'HTML',
                message_thread_id: mainTopicId
            });

            // 3. Send Individual District Summaries to their Topics
            for (const d of svod) {
                const topicId = getTopicId(d.district);
                if (!topicId || topicId === mainTopicId) continue;

                let distMsg = `📊 <b>KUNLIK YAKUNIY HISOBOT</b>\n`;
                distMsg += `📍 Hudud: <b>${d.district}</b>\n`;
                distMsg += `📅 Sana: <b>${dateStr}</b>\n\n`;
                distMsg += `🏢 Kiritgan maktablar: <b>${d.entries} / ${d.total_schools}</b>\n`;
                distMsg += `👥 Jami o'quvchilar: <b>${(d.students || 0).toLocaleString()}</b>\n`;
                distMsg += `✅ Sababli kelmaganlar: <b>${d.sababli || 0}</b>\n`;
                distMsg += `🚫 Sababsiz kelmaganlar: <b>${d.sababsiz || 0}</b>\n`;
                distMsg += `📉 Davomat ko'rsatkichi: <b>${(d.avg_percent || 0).toFixed(1)}%</b>\n\n`;
                distMsg += `👉 <a href="https://ferghanaregdavomat.uz/dashboard.html">Batafsil dashboardda</a>`;

                try {
                    await bot.telegram.sendMessage(REPORT_GROUP_ID, distMsg, {
                        parse_mode: 'HTML',
                        message_thread_id: topicId,
                        disable_web_page_preview: true
                    });
                } catch (err) {
                    console.error(`Error sending individual report to ${d.district}:`, err.message);
                }
            }

            console.log("✅ [CRON] Daily summaries sent successfully to all topics.");

            // 4. Web Push Notification
            await sendPushNotifications("Bugungi kun uchun yakuniy hisobotlar tayyor! Ularni dashboardda va Telegram kanallarda ko'rishingiz mumkin.");
        }
    } catch (e) {
        console.error("❌ [CRON] Daily summary error:", e);
    }
}

async function sendPushNotifications(message) {
    const webpush = require('web-push');
    const db_pg = require('../database/pg');

    webpush.setVapidDetails(
        'mailto:imronbekr@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );

    try {
        const res = await db_pg.query('SELECT subscription FROM push_subscriptions');
        const subscriptions = res.rows.map(r => JSON.parse(r.subscription));

        const payload = JSON.stringify({
            title: 'Ferghana Davomat',
            body: message,
            icon: '/logo.png'
        });

        const promises = subscriptions.map(sub =>
            webpush.sendNotification(sub, payload).catch(e => {
                if (e.statusCode === 410) {
                    db_pg.query('DELETE FROM push_subscriptions WHERE subscription = $1', [JSON.stringify(sub)]);
                }
            })
        );
        await Promise.all(promises);
        console.log(`✅ [Push] Sent to ${promises.length} devices.`);
    } catch (e) {
        console.error("❌ [Push] Error:", e);
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

                // --- 🎖 NEW: Generate Image Certificate for #1 school ---
                try {
                    const topSchool = res.rows[0];
                    if (parseFloat(topSchool.avg_p) >= 90) { // Faqat 90% dan yuqori bo'lsa
                        const { generateCertificate } = require('./rewardService');
                        const buffer = await generateCertificate(topSchool.school, distName, 'Haftalik');

                        await bot.telegram.sendPhoto(REPORT_GROUP_ID, { source: buffer }, {
                            caption: `🏆 <b>HAFTANING ENG YAXSHI MAKTABI!</b>\n\n<b>${distName}</b> bo'yicha eng yuqori ko'rsatkich: <b>${topSchool.school}</b> (${parseFloat(topSchool.avg_p).toFixed(1)}%)`,
                            parse_mode: 'HTML',
                            message_thread_id: topicId
                        });
                    }
                } catch (imgErr) {
                    console.error("Reward Image Error:", imgErr.message);
                }

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

/**
 * Warn non-reporting schools every 2 hours
 */
async function sendPendingReportsWarning() {
    console.log("🕒 [CRON] Starting non-reporting schools warning...");
    const now = getFargonaTime();
    const dateStr = now.toISOString().split('T')[0];
    const hour = now.getHours();

    try {
        const db_pg = require('../database/pg');
        const { schools_db } = require('../database/db');
        const topics = topicsConfig.getTopics();
        const districts = Object.keys(topics).filter(d => d !== "Test rejimi" && d !== "MMT Boshqarma");

        for (const distName of districts) {
            const topicId = getTopicId(distName);
            if (!topicId) continue;

            const reportedRes = await db_pg.query(`SELECT school FROM attendance WHERE district = $1 AND date = $2`, [distName, dateStr]);
            const reportedSchools = reportedRes.rows.map(r => r.school);

            const allSchoolsInDist = schools_db[distName] || [];
            const missingSchools = allSchoolsInDist.filter(s => !reportedSchools.includes(s));

            if (missingSchools.length > 0) {
                let msg = `⚠️ <b>DIQQAT: HISOBOT TOPSHIRMAGAN MAKTABLAR</b>\n`;
                msg += `📍 Hudud: <b>${distName}</b>\n`;
                msg += `⏰ Vaqt: <b>${hour}:00</b>\n`;
                msg += `📅 Sana: <b>${dateStr}</b>\n\n`;
                msg += `🛑 <b>Topshirmadi: ${missingSchools.length} ta maktab</b>\n`;

                // Show first 30 schools to avoid message length limits
                const list = missingSchools.slice(0, 30);
                list.forEach(s => {
                    msg += `• ${s}\n`;
                });

                if (missingSchools.length > 30) msg += `...va yana ${missingSchools.length - 30} ta maktab.\n`;

                msg += `\n❗ <i>Iltimos, hisobotlarni zudlik bilan kiritishingizni so'raymiz!</i>`;

                await bot.telegram.sendMessage(REPORT_GROUP_ID, msg, {
                    parse_mode: 'HTML',
                    message_thread_id: topicId
                });
            }
        }
        console.log("✅ [CRON] Non-reporting warnings sent.");
    } catch (e) {
        console.error("❌ [CRON] Pending reports warning error:", e);
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

    // 4. Pending Reports Warning (Every 2 hours from 10:00 to 14:00, Monday-Saturday)
    cron.schedule('0 10,12,14 * * 1-6', () => {
        sendPendingReportsWarning();
    }, { timezone: "Asia/Tashkent" });

    console.log("🚀 [Scheduler] Automated reports initialized.");
}

module.exports = { initCrons };

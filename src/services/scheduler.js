const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const { getViloyatSvod, exportToExcel, exportWeeklyExcel, getMissingSchools } = require('./dataService');
const { getFargonaTime } = require('../utils/fargona');
const topicsConfig = require('../config/topics');
const { getTopicId, normalizeKey } = require('../utils/topics');
const config = require('../config/config');
const msgs = require('../utils/messages');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const REPORT_GROUP_ID = config.REPORT_GROUP_ID;

// Recipient List for Private Reports
const ADMIN_RECIPIENTS = config.ADMIN_RECIPIENTS || [];

/**
 * Sends a humor-based status message to general channel
 */
async function sendHumorStatus(type) {
    let msg = "";
    if (type === 'start') msg = msgs.getWorkStartMsg();
    else if (type === 'end') msg = msgs.getWorkEndMsg();
    else if (type === 'sunday') msg = msgs.getSundayMsg();

    if (!msg) return;

    try {
        const mainTopicId = getTopicId("MMT Boshqarma") || getTopicId("Test rejimi");
        await bot.telegram.sendMessage(REPORT_GROUP_ID, msg, {
            parse_mode: 'HTML',
            message_thread_id: mainTopicId
        });
    } catch (e) {
        console.error("Humor Msg Error:", e.message);
    }
}

/**
 * Daily Summary (Svod) at 16:15
 */
async function sendDailySummary() {
    console.log("🕒 [CRON] Starting daily summary at 16:15...");
    const now = getFargonaTime();
    const dateStr = now.toISOString().split('T')[0];

    try {
        const filePath = await exportToExcel(dateStr);
        const svod = await getViloyatSvod(dateStr);

        let enteredSchools = 0;
        let vStudents = 0;
        let vAbsents = 0;

        svod.forEach(d => {
            enteredSchools += (d.entries || 0);
            vStudents += (d.students || 0);
            vAbsents += (d.total_absent || 0);
        });

        const vPercent = vStudents > 0 ? ((vStudents - vAbsents) / vStudents * 100).toFixed(1) : 0;

        let msg = `📊 <b>KUNLIK YAKUNIY HISOBOT (SVOD)</b>\n\n`;
        msg += `📅 Sana: <b>${dateStr}</b>\n`;
        msg += `🕒 Vaqt: <b>16:15</b>\n\n`;
        msg += `🏢 Kiritgan maktablar: <b>${enteredSchools} ta</b>\n`;
        msg += `👥 Jami o'quvchilar: <b>${vStudents.toLocaleString()}</b>\n`;
        msg += `📉 Davomat ko'rsatkichi: <b>${vPercent}%</b>\n\n`;
        msg += `👇 Batafsil hududlar kesimida Excel hisobotda:`;

        // 1. Send to Report Group (MMT Boshqarma Topic)
        const mainTopicId = getTopicId("MMT Boshqarma");
        if (filePath) {
            await bot.telegram.sendDocument(REPORT_GROUP_ID, { source: filePath }, {
                caption: msg,
                parse_mode: 'HTML',
                message_thread_id: mainTopicId
            });

            // 2. Send to Admin Recipients privately
            for (const adminId of ADMIN_RECIPIENTS) {
                try {
                    await bot.telegram.sendDocument(adminId, { source: filePath }, {
                        caption: msg,
                        parse_mode: 'HTML'
                    });
                } catch (err) {
                    console.error(`Failed to send daily to admin ${adminId}:`, err.message);
                }
            }
        }
    } catch (e) {
        console.error("❌ [CRON] Daily summary error:", e);
    }
}

/**
 * Weekly Analytical Summary (Sunday 10:00)
 */
async function sendWeeklyAnalyticalSummary() {
    console.log("🕒 [CRON] Starting weekly analytical report at 10:00...");
    const now = getFargonaTime();
    const dateStr = now.toISOString().split('T')[0];

    try {
        const filePath = await exportWeeklyExcel(dateStr);
        let msg = `📈 <b>HAFTALIK ANALITIK TAHLIL (SVOD)</b>\n\n`;
        msg += `📅 Sana: <b>${dateStr}</b> (Yakshanba)\n`;
        msg += `📊 O'tgan haftadagi umumiy davomat ko'rsatkichlari, eng namunali va tanqidiy maktablar tahlili.\n\n`;
        msg += `📂 Batafsil ma'lumot ilova qilingan Excel faylda.`;

        if (filePath) {
            // Send to Admin Recipients privately
            for (const adminId of ADMIN_RECIPIENTS) {
                try {
                    await bot.telegram.sendDocument(adminId, { source: filePath }, {
                        caption: msg,
                        parse_mode: 'HTML'
                    });
                } catch (err) {
                    console.error(`Failed to send weekly to admin ${adminId}:`, err.message);
                }
            }
        }
    } catch (e) {
        console.error("❌ [CRON] Weekly analytical error:", e);
    }
}

/**
 * Fix for Topic Warnings: Ensure all topics get the message and no duplicates
 */
async function sendPendingReportsWarning(hour) {
    console.log(`🕒 [CRON] Starting pending reports warning at ${hour}:00...`);
    const now = getFargonaTime();
    const dateStr = now.toISOString().split('T')[0];

    try {
        const mData = await getMissingSchools();
        if (!mData) return;

        // Iterate through all districts defined in topics
        const topics = topicsConfig.getTopics();

        for (const distName in topics) {
            if (distName === "Test rejimi" || distName === "MMT Boshqarma") continue;

            const missing = mData[distName] || [];
            if (missing.length > 0) {
                const topicId = topics[distName];
                let txt = msgs.getWarningMsg(distName, hour) + "\n\n";

                const list = missing.slice(0, 40);
                list.forEach((s, i) => { txt += `${i + 1}. ❌ ${s}\n`; });
                if (missing.length > 40) txt += `...ва яна ${missing.length - 40} та мактаб.`;

                txt += `\n\n❗️ Iltimos, o'z vaqtida kiritishni ta'minlang.`;

                try {
                    await bot.telegram.sendMessage(REPORT_GROUP_ID, txt, {
                        parse_mode: 'HTML',
                        message_thread_id: topicId
                    });
                } catch (err) {
                    console.error(`Error sending warning to ${distName}:`, err.message);
                }
            }
        }
    } catch (e) {
        console.error("❌ [CRON] Pending reports warning error:", e);
    }
}

async function sendDeadlineWarning(type) {
    const hour = type === '30min' ? 15 : 16;
    const mData = await getMissingSchools();
    if (!mData) return;

    const topics = topicsConfig.getTopics();
    for (const distName in topics) {
        if (distName === "Test rejimi" || distName === "MMT Boshqarma") continue;

        const missing = mData[distName] || [];
        if (missing.length > 0) {
            const topicId = topics[distName];
            let txt = type === '30min' ? msgs.getDeadline30Msg(distName) : msgs.getFinalDeadlineMsg(distName);
            txt += "\n\n";

            const list = missing.slice(0, 40);
            list.forEach((s, i) => { txt += `${i + 1}. ❌ ${s}\n`; });

            try {
                await bot.telegram.sendMessage(REPORT_GROUP_ID, txt, {
                    parse_mode: 'HTML',
                    message_thread_id: topicId
                });
            } catch (err) {
                console.error(`Error sending deadline to ${distName}:`, err.message);
            }
        }
    }
}

// Initialize Cron Jobs
function initCrons() {
    // 1. Humor: Work Start (08:30 Mon-Sat)
    cron.schedule('30 8 * * 1-6', () => sendHumorStatus('start'), { timezone: "Asia/Tashkent" });

    // 2. Humor: Work End (16:30 Mon-Sat)
    cron.schedule('30 16 * * 1-6', () => sendHumorStatus('end'), { timezone: "Asia/Tashkent" });

    // 3. Humor: Sunday (09:30 Sunday)
    cron.schedule('30 9 * * 0', () => sendHumorStatus('sunday'), { timezone: "Asia/Tashkent" });

    // 4. Daily Summary at 16:15 (Monday-Saturday)
    cron.schedule('15 16 * * 1-6', () => {
        sendDailySummary();
    }, { timezone: "Asia/Tashkent" });

    // 5. Weekly Analytical Summary (Sunday at 10:00)
    cron.schedule('0 10 * * 0', () => {
        sendWeeklyAnalyticalSummary();
    }, { timezone: "Asia/Tashkent" });

    // 6. Warnings (09:00, 11:00, 13:00, 15:00 Mon-Sat)
    cron.schedule('0 9,11,13,15 * * 1-6', (e) => {
        const h = new Date().getHours();
        sendPendingReportsWarning(h);
    }, { timezone: "Asia/Tashkent" });

    // 7. Deadline 15:30 (30 mins warning)
    cron.schedule('30 15 * * 1-6', () => sendDeadlineWarning('30min'), { timezone: "Asia/Tashkent" });

    // 8. Deadline 16:00 (Final warning)
    cron.schedule('0 16 * * 1-6', () => sendDeadlineWarning('final'), { timezone: "Asia/Tashkent" });

    console.log("🚀 [Scheduler] Optimized crons initialized (Daily 16:15, Weekly Sun 10:00).");
}

module.exports = { initCrons };

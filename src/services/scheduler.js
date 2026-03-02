const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const { getViloyatSvod, getTumanSvod, exportToExcel, exportDistrictExcel, exportWeeklyExcel, getMissingSchools } = require('./dataService');
const { getFargonaTime, getFargonaDate } = require('../utils/fargona');
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
    const dateStr = getFargonaDate();

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
 * District Daily Svod - Sent to Each District's Own Topic at 16:30
 * Har bir tuman/shahar o'z topiciga o'z hududidagi maktablar bo'yicha svod oladi
 */
async function sendDistrictDailySvod() {
    console.log("🕒 [CRON] Starting district daily svod at 16:30...");
    const now = getFargonaTime();
    const dateStr = getFargonaDate();
    const topics = topicsConfig.getTopics();

    for (const distName in topics) {
        if (distName === "Test rejimi" || distName === "MMT Boshqarma") continue;

        const topicId = topics[distName];
        if (!topicId) continue;

        try {
            // Get district-level data
            const tumanData = await getTumanSvod(distName, dateStr, 200, 0);
            const rows = tumanData.rows || [];

            const entered = rows.filter(r => r.fio && r.fio !== 'Kiritilmagan');
            const missing = rows.filter(r => !r.fio || r.fio === 'Kiritilmagan');
            const totalSchools = rows.length;
            const enteredCount = entered.length;
            const totalStudents = entered.reduce((s, r) => s + (parseInt(r.total_students) || 0), 0);
            const totalAbsent = entered.reduce((s, r) => s + (parseInt(r.total_absent) || 0), 0);
            const totalSababsiz = entered.reduce((s, r) => s + (parseInt(r.sababsiz_jami) || 0), 0);
            const avgPercent = totalStudents > 0
                ? ((totalStudents - totalAbsent) / totalStudents * 100).toFixed(1)
                : '0.0';

            const emoji = parseFloat(avgPercent) >= 95 ? '🟢' : parseFloat(avgPercent) >= 90 ? '🟡' : '🔴';

            let msg = `📊 <b>KUNLIK YAKUNIY SVOD — ${distName.toUpperCase()}</b>\n\n`;
            msg += `📅 <b>Sana:</b> ${dateStr}\n`;
            msg += `🕒 <b>Eslatma vaqti:</b> 16:30\n\n`;
            msg += `🏫 <b>Jami maktablar:</b> ${totalSchools} ta\n`;
            msg += `✅ <b>Hisobot topshirdi:</b> ${enteredCount} ta\n`;
            msg += `❌ <b>Hisobot topshirmadi:</b> ${missing.length} ta\n\n`;
            msg += `👥 <b>Jami o'quvchilar:</b> ${totalStudents.toLocaleString()}\n`;
            msg += `📉 <b>Sababli kelmaganlar:</b> ${totalAbsent - totalSababsiz}\n`;
            msg += `🚨 <b>Sababsiz kelmaganlar:</b> ${totalSababsiz}\n`;
            msg += `${emoji} <b>Davomat ko'rsatkichi:</b> ${avgPercent}%\n`;

            if (missing.length > 0) {
                msg += `\n⚠️ <b>Hisobot topshirmagan maktablar:</b>\n`;
                missing.slice(0, 20).forEach((m, i) => {
                    msg += `${i + 1}. ❌ ${m.school}\n`;
                });
                if (missing.length > 20) msg += `...va yana ${missing.length - 20} ta maktab.`;
            }

            // Try to generate district Excel
            let filePath = null;
            try {
                filePath = await exportDistrictExcel(distName, dateStr);
            } catch (excelErr) {
                console.error(`Excel error for ${distName}:`, excelErr.message);
            }

            if (filePath) {
                const fs = require('fs');
                if (fs.existsSync(filePath)) {
                    await bot.telegram.sendDocument(REPORT_GROUP_ID, { source: filePath }, {
                        caption: msg,
                        parse_mode: 'HTML',
                        message_thread_id: topicId
                    });
                } else {
                    await bot.telegram.sendMessage(REPORT_GROUP_ID, msg, {
                        parse_mode: 'HTML',
                        message_thread_id: topicId
                    });
                }
            } else {
                await bot.telegram.sendMessage(REPORT_GROUP_ID, msg, {
                    parse_mode: 'HTML',
                    message_thread_id: topicId
                });
            }

            console.log(`✅ [SVOD] Sent to ${distName} (topic: ${topicId})`);
            // Small delay to avoid Telegram rate limits
            await new Promise(r => setTimeout(r, 1000));

        } catch (err) {
            console.error(`❌ [SVOD] Error for ${distName}:`, err.message);
        }
    }

    console.log("✅ [CRON] District daily svod completed.");
}

/**
 * Weekly Analytical Summary (Sunday 10:00)
 */
async function sendWeeklyAnalyticalSummary() {
    console.log("🕒 [CRON] Starting weekly analytical report at 10:00...");
    const now = getFargonaTime();
    const dateStr = getFargonaDate();

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
    const dateStr = getFargonaDate();

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

    // 2. Humor: Work End (17:00 Mon-Sat) — 16:30 now used for district svod
    cron.schedule('0 17 * * 1-6', () => sendHumorStatus('end'), { timezone: "Asia/Tashkent" });

    // 3. Humor: Sunday (09:30 Sunday)
    cron.schedule('30 9 * * 0', () => sendHumorStatus('sunday'), { timezone: "Asia/Tashkent" });

    // 4. Daily Summary at 16:15 (Monday-Saturday)
    cron.schedule('15 16 * * 1-6', () => {
        sendDailySummary();
    }, { timezone: "Asia/Tashkent" });

    // 5. *** YANGI *** District Daily Svod at 16:30 — Har bir tuman o'z topiciga
    cron.schedule('30 16 * * 1-6', () => {
        sendDistrictDailySvod();
    }, { timezone: "Asia/Tashkent" });

    // 6. Weekly Analytical Summary (Sunday at 10:00)
    cron.schedule('0 10 * * 0', () => {
        sendWeeklyAnalyticalSummary();
    }, { timezone: "Asia/Tashkent" });

    // 7. Warnings (09:00 - 15:00 every hour Mon-Sat)
    cron.schedule('0 9,10,11,12,13,14,15 * * 1-6', (e) => {
        const h = new Date().getHours();
        sendPendingReportsWarning(h);
    }, { timezone: "Asia/Tashkent" });

    // 8. Deadline 15:30 (30 mins warning)
    cron.schedule('30 15 * * 1-6', () => sendDeadlineWarning('30min'), { timezone: "Asia/Tashkent" });

    // 9. Deadline 16:00 (Final warning)
    cron.schedule('0 16 * * 1-6', () => sendDeadlineWarning('final'), { timezone: "Asia/Tashkent" });

    console.log("🚀 [Scheduler] Crons initialized: Viloyat svod 16:15 | Tuman svod 16:30 | Weekly Sun 10:00.");
}

module.exports = { initCrons };

const { Telegraf } = require('telegraf');
const db = require('../database/db');
require('dotenv').config();

const parentBot = new Telegraf(process.env.PARENT_BOT_TOKEN || process.env.BOT_TOKEN);

/**
 * Notifies parents about their child's absence.
 * @param {Object} reportData - The attendance report data.
 * @param {Array} studentsList - List of absent students (objects with name, class, etc.)
 */
async function notifyParents(reportData, studentsList) {
    if (!studentsList || studentsList.length === 0) return;

    const district = reportData.district;
    const school = reportData.school;
    const allUsers = db.users_db;

    console.log(`📡 [Notification] Checking parents for ${district}, ${school}...`);

    for (const uid in allUsers) {
        const user = allUsers[uid];

        // Only process parents
        if (user.role !== 'parent' || !user.subscriptions) continue;

        // Find relevant subscriptions for this school
        const relevantSubs = user.subscriptions.filter(s =>
            s.district === district && s.school === school
        );

        if (relevantSubs.length === 0) continue;

        for (const sub of relevantSubs) {
            // Check if this specific child is in the absent list
            // We use a loose match for names (e.g., includes or split-match)
            const absentChild = studentsList.find(student =>
                isSameName(student.name, sub.name)
            );

            if (absentChild) {
                await sendNotification(user.chat_id, user.lang || 'uz_lat', {
                    childName: sub.name,
                    class: absentChild.class,
                    school: school,
                    district: district,
                    date: new Date().toLocaleDateString('uz-UZ')
                });
            }
        }
    }
}

function isSameName(name1, name2) {
    if (!name1 || !name2) return false;
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();
    return n1.includes(n2) || n2.includes(n1);
}

async function sendNotification(chatId, lang, data) {
    const msgs = {
        uz_lat: `🔔 <b>DIQQAT: Farzandingiz darsda qatnashmadi!</b>\n\n` +
            `👶 O'quvchi: <b>${data.childName}</b>\n` +
            `📚 Sinf: ${data.class}\n` +
            `🏫 Maktab: ${data.school}\n` +
            `📍 Hudud: ${data.district}\n` +
            `📅 Sana: ${data.date}\n\n` +
            `⚠️ Farzandingiz bugun dars qoldirdi. Iltimos, maktab bilan bog'laning.`,
        uz_cyr: `🔔 <b>ДИҚҚАТ: Фарзандингиз дарсда қатнашмади!</b>\n\n` +
            `👶 Ўқувчи: <b>${data.childName}</b>\n` +
            `📚 Синф: ${data.class}\n` +
            `🏫 Мактаб: ${data.school}\n` +
            `📍 Ҳудуд: ${data.district}\n` +
            `📅 Сана: ${data.date}\n\n` +
            `⚠️ Фарзандингиз бугун дарс қолдирди. Илтимос, мактаб билан боғланинг.`,
        ru: `🔔 <b>ВНИМАНИЕ: Ваш ребенок пропустил занятия!</b>\n\n` +
            `👶 Ученик: <b>${data.childName}</b>\n` +
            `📚 Класс: ${data.class}\n` +
            `🏫 Школа: ${data.school}\n` +
            `📍 Район: ${data.district}\n` +
            `📅 Дата: ${data.date}\n\n` +
            `⚠️ Ваш ребенок сегодня пропустил школу. Пожалуйста, свяжитесь со школой.`
    };

    const text = msgs[lang] || msgs.uz_lat;
    try {
        await parentBot.telegram.sendMessage(chatId, text, { parse_mode: 'HTML' });
        console.log(`✅ [Notification] Sent to parent ${chatId} for ${data.childName}`);
    } catch (e) {
        console.error(`❌ [Notification] Failed to send to ${chatId}:`, e.message);
    }
}

module.exports = { notifyParents };

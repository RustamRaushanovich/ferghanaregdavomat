const { Telegraf } = require('telegraf');
require('dotenv').config();
const config = require('../src/config/config');

const bot = new Telegraf(process.env.BOT_TOKEN);
const parentsBotLink = "https://t.me/ferregdavomatparents_bot"; // Taxminiy, lekin mashhur format

const admins = config.DISTRICT_ADMINS;
const adminIds = Object.keys(admins);

const message = `🛡 <b>#TOPSHIRIQ: Davomat Ota-onalar Nazorati Botini ishga tushirdik!</b>\n\n` +
    `Hurmatli tuman/shahar mas'uli, maktablarda ota-onalar farzandlarining davomatini masofadan turib kuzatib borishlari va qat'iy nazorat o'rnatish maqsadida maxsus bot ishga tushirildi.\n\n` +
    `🔗 <b>Bot manzili:</b> @ferregdavomatparents_bot\n` +
    `<i>(Havola: ${parentsBotLink})</i>\n\n` +
    `📌 <b>Vazifangiz:</b>\n` +
    `Ushbu xabarnomani tumaningizdagi barcha maktab guruhlariga va MMIBDO'larga yuboring. Har bir maktab o'z navbatida ota-onalarni ushbu botga a'zo bo'lishlarini ta'minlasin.\n\n` +
    `✨ <b>Eslatma:</b> Ota-onalar ro'yxatdan o'tayotganda o'z hududini va maktabini to'g'ri tanlashlari shart. Barcha ma'lumotlar veb-panelingizdagi "Ota-onalar" bo'limida real vaqtda ko'rinib boradi.`;

async function broadcast() {
    console.log(`🚀 19 ta tuman mas'ullariga xabar yuborish boshlandi...`);
    let sent = 0;
    let failed = 0;

    for (const uid of adminIds) {
        try {
            await bot.telegram.sendMessage(uid, message, { parse_mode: 'HTML' });
            console.log(`✅ [${admins[uid]}] - Yuborildi`);
            sent++;
        } catch (e) {
            console.error(`❌ [${admins[uid]}] - Xatolik: ${e.message}`);
            failed++;
        }
    }

    // Superadminlarga ham yuboramiz (hisobot tariqasida)
    for (const aid of config.SUPER_ADMIN_IDS) {
        try {
            await bot.telegram.sendMessage(aid, `📢 <b>Tizim xabari:</b> 19 ta tuman mas'ullariga ota-onalar boti haqida topshiriq va havola yuborildi.\n\n<b>Natija:</b>\n✅ Yetkazildi: ${sent}\n❌ Xatolik: ${failed}`, { parse_mode: 'HTML' });
        } catch (e) { }
    }

    console.log(`\n🏁 Jarayon yakunlandi. Yetkazildi: ${sent}, Xatolik: ${failed}`);
    process.exit();
}

broadcast();

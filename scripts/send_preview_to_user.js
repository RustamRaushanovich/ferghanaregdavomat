const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const parentsBotLink = "https://t.me/ferregdavomatparents_bot";
const userId = "65002404"; // Sizning ID raqamingiz

const message = `🛡 <b>#TOPSHIRIQ: Davomat Ota-onalar Nazorati Botini ishga tushirdik!</b>\n\n` +
    `Hurmatli tuman/shahar mas'uli, maktablarda ota-onalar farzandlarining davomatini masofadan turib kuzatib borishlari va qat'iy nazorat o'rnatish maqsadida maxsus bot ishga tushirildi.\n\n` +
    `🔗 <b>Bot manzili:</b> @ferregdavomatparents_bot\n` +
    `<i>(Havola: ${parentsBotLink})</i>\n\n` +
    `📌 <b>Vazifangiz:</b>\n` +
    `Ushbu xabarnomani tumaningizdagi barcha maktab guruhlariga va MMIBDO'larga yuboring. Har bir maktab o'z navbatida ota-onalarni ushbu botga a'zo bo'lishlarini ta'minlasin.\n\n` +
    `✨ <b>Eslatma:</b> Ota-onalar ro'yxatdan o'tayotganda o'z hududini va maktabini to'g'ri tanlashlari shart. Barcha ma'lumotlar veb-panelingizdagi "Ota-onalar" bo'limida real vaqtda ko'rinib boradi.`;

async function sendToMe() {
    try {
        await bot.telegram.sendMessage(userId, message, { parse_mode: 'HTML' });
        console.log("✅ Xabar sizga yuborildi!");
    } catch (e) {
        console.error("❌ Xatolik:", e.message);
    }
    process.exit();
}

sendToMe();

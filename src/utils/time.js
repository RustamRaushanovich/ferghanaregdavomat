const { Markup } = require('telegraf');

const EARLY_MESSAGES = [
    "🌑 Hali yulduzlar so'nmagan, siz esa ishlamoqchisiz? Qoyil! Lekin 08:00 ni kuting.",
    "☕️ Tonggi qahva vaqti! Bot esa 08:00 da ishga tushadi. Ungacha tetiklashib oling.",
    "🥱 Bot hali 'Zaryadka' olyapti. Iltimos, 08:00 da keling.",
    "🏃‍♂️ G‘ayratingizga tasanno! Lekin hisobot qabul qilish 08:00 dan boshlanadi.",
    "🔒 Tizim eshiklari 08:00 da ochiladi. Hozircha sabr qiling.",
    "🧘‍♂️ Biroz meditatsiya qiling. Ishga hali erta (08:00).",
    "📢 Diqqat! Tizim 08:00 da faollashadi. Ungacha yangiliklarni o'qib turing."
];

const LATE_MESSAGES = [
    "🌙 Kech bo'ldi, endi dam oling! Bot ham charchadi.",
    "⛔️ Ish vaqti tugadi. Ertaga xudo xohlasa davom etamiz.",
    "🚶‍♂️ Uyga ketavering, bugungi hisobotlar yopildi.",
    "🦉 Kechasi ishlash sog'liqqa zarar. Ertaga 08:00 da kutamiz!",
    "📉 Buxgalteriya yopildi, kassa tugadi. Ertaga keling.",
    "🎬 Bugungi spektakl tugadi. Pardalar yopildi!",
    "🔋 Botning quvvati tugadi. Ertalabgacha zaryad oladi."
];

const { getFargonaTime } = require('./fargona');

function checkTime(ctx, isPro) {
    const now = getFargonaTime();
    const h = now.getHours();
    const m = now.getMinutes();

    const channelLink = Markup.inlineKeyboard([
        [Markup.button.url("📰 Boshqarma Yangiliklari", "https://t.me/FarVMMTB")]
    ]);

    if (h < 8) {
        const msg = EARLY_MESSAGES[Math.floor(Math.random() * EARLY_MESSAGES.length)];
        ctx.replyWithHTML(`⛔️ <b>${msg}</b>\n\n<i>Vaqtdan unumli foydalaning, boshqarmamiz yangiliklarini o'qing:</i>`, channelLink);
        return false;
    }

    let isLate = false;
    let limitStr = isPro ? "16:00" : "15:30";

    if (isPro) {
        if (h >= 16) isLate = true;
    } else {
        if (h > 15 || (h === 15 && m >= 30)) isLate = true;
    }

    if (isLate) {
        const msg = LATE_MESSAGES[Math.floor(Math.random() * LATE_MESSAGES.length)];
        ctx.replyWithHTML(`⛔️ <b>${msg}</b>\n\n(Limit: ${limitStr} gacha)\n\n<i>Vaqtdan unumli foydalaning, boshqarmamiz yangiliklarini o'qing:</i>`, channelLink);
        return false;
    }
    return true;
}

module.exports = { checkTime };

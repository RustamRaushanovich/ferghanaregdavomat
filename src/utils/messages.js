/**
 * Utility for generating varied and "funny" messages for different events.
 */

const WORK_START_MSGS = [
    "🚀 Xayrli tong! Yangi ish kuni boshlandi. Davomatni kiritishni unutmang!",
    "☀️ Kuningiz xayrli o'tsin! Maktablarimizda davomat qanday? Kiritishga shoshiling.",
    "☕️ Kofe ichib bo'ldingizmi? Unda ishga! Davomat kiritish vaqti keldi.",
    "🎒 O'quvchilar partada, MMIBDO'lar esa klaviatura qarshisida. Davomatni boshladik!",
    "🏁 Start! Bugungi davomat poygasida kim birinchi bo'lar ekan?"
];

const WORK_END_MSGS = [
    "🌆 Ish vaqti ham nihoyasiga yetdi. Charchamadingizmi?",
    "🔚 Bugun ham ancha ter to'kdik. Endi esa dam olish vaqti.",
    "🌙 Kech kirdi. Davomat kiritganlarga rahmat, kiritmaganlarga... ertagacha!",
    "🏃‍♂️ Bugungi marra bosib o'tildi. Ertaga yanada faolroq bo'lamiz degan umiddamiz.",
    "👋 Xayrli kech! Bugungi xizmatlar uchun barchaga tashakkur."
];

const SUNDAY_MSGS = [
    "⛱ Bugun yakshanba! Mazza qilib dam oling, o'quvchilar ham, siz ham orom olyapsiz.",
    "🥗 Oshpazlikda mahoratingizni ko'rsatadigan kun keldi. Palov muborak!",
    "💤 Bugun hamma narsani unuting, faqat dam olishni o'ylang. Davomat ertaga!",
    "👨‍👩‍👧‍👦 Oilangiz davrasida shirin suhbatlar hamроh bo'lsin. Yakshanbangiz xayrli o'tsin!",
    "🛌 Bugun kechgacha uxlashga ruxsat! Negaki bugun hafta dami - yakshanba."
];

const WARNING_MSGS = [
    "⚠️ <b>Eslatma ({hour}:00):</b>\n\n📍 <b>{district}</b> da quyidagi maktablar hali ham davomat kiritmadi:",
    "📢 <b>Diqqat!</b> <b>{district}</b> bo'yicha hisobot bermagan maktablar ro'yxati:",
    "🧐 <b>{district}</b> ma'sullari, quyidagi maktablarimiz hali kiritishmagan:",
    "🚨 <b>Monitoring ({hour}:00):</b> <b>{district}</b> da davomat kiritilmagan maktablar:",
    "⚡️ <b>Tezkor eslatma!</b> <b>{district}</b> da hisobot qolib ketmoqda:"
];

const DEADLINE_30MIN_MSGS = [
    "⏳ <b>DIQQAT! 16:00 gacha 30 daqiqa vaqt qoldi!</b>\n\n🚨 <b>{district}</b> bo'yicha quyidagi maktablar hali davomat kiritmagan:",
    "⏲️ <b>Vaqt tugamoqda!</b> 30 daqiqadan so'ng hisobot qabul qilinmayди. <b>{district}</b> kiritmaganlar:",
    "🏃‍♂️ <b>Shoshiling!</b> Oxirgi 30 daqiqa boshlandi. <b>{district}</b> qolib кетган мактаблар:",
    "⌛ <b>Vaqt g'animat!</b> 16:00 ga juda oz qoldi. <b>{district}</b> бўйича ҳали ҳам киритмаганлар:"
];

const FINAL_DEADLINE_MSGS = [
    "🚫 <b>AFSUSKI! Ish vaqti tugadi (16:00).</b>\n\n😔 <b>{district}</b> bo'yicha quyidagi maktablar bugun davomat kiritishmadi:",
    "🔚 <b>Vaqt nihoyasiga yetdi.</b> Afsuski, <b>{district}</b> даги ушбу мактаблар улгуришмади:",
    "🛑 <b>Qizil chiziq!</b> Bugungi hisobot <b>{district}</b> учун якунланди. Киритмаган мактаблар:",
    "🔇 <b>Sukunat...</b> 16:00 бўлди. <b>{district}</b> бўйича ҳисобот топширмаган мактабларни рўйхати:"
];

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
    getWorkStartMsg: () => getRandom(WORK_START_MSGS),
    getWorkEndMsg: () => getRandom(WORK_END_MSGS),
    getSundayMsg: () => getRandom(SUNDAY_MSGS),
    getWarningMsg: (district, hour) => getRandom(WARNING_MSGS).replace('{district}', district).replace('{hour}', hour),
    getDeadline30Msg: (district) => getRandom(DEADLINE_30MIN_MSGS).replace('{district}', district),
    getFinalDeadlineMsg: (district) => getRandom(FINAL_DEADLINE_MSGS).replace('{district}', district)
};

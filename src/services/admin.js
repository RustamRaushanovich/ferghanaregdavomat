const { Markup } = require('telegraf');
const { SUPER_ADMIN_IDS, SPECIALIST_IDS, RESTRICTED_IDS } = require('../config/config');
const db = require('../database/db');

function showAdminPanel(ctx) {
    const uid = Number(ctx.from.id);

    // ABYIR (HARDCORE) CHECK
    if (uid === 65002404 || SUPER_ADMIN_IDS.map(Number).includes(uid)) {
        try {
            // Safe status check
            let status = "🟢 O'CHIRILGAN";
            if (db && db.settings && db.settings.vacation_mode) status = "🔴 YOQILGAN";

            const buttons = [
                ["👥 Pro Ro'yxat", "❌ Pro Bekor Qilish"],
                ["➕ Promokod Yaratish", "📢 Qarzdorlarga ABOROT"],
                ["📢 E'lon Yuborish", `Status: ${status}`],
                ["🔴 Ta'tilni YOQISH", "🟢 Ta'tilni O'CHIRISH"],
                ["📥 TEST REPORT", "📢 Kiritmaganlar (Manual)"],
                ["📊 Grafika", "🏆 Reyting"],
                ["📥 Excel Yuklab olish", "🔄 Bazani yangilash"],
                ["🖥 Dashboard Logins", "📊 Svod va Hisobotlar"],
                ["📝 Rejalar", "⬅️ Orqaga"]
            ];

            return ctx.reply(`🔧 Super Admin Panel (Modular v2).`, Markup.keyboard(buttons).resize());
        } catch (err) {
            return ctx.reply("Admin Panel Ichki Xatolik: " + err.message);
        }
    }

    // Checking other admins...
    const allAdmins = [...SUPER_ADMIN_IDS, ...SPECIALIST_IDS, ...RESTRICTED_IDS].map(id => Number(id));
    if (!allAdmins.includes(uid)) {
        return ctx.reply("⛔️ Sizga ruxsat yo'q.");
    }

    // Other admin roles logic
    let buttons = [["⬅️ Orqaga"]];
    if (SPECIALIST_IDS.map(Number).includes(uid)) {
        buttons = [
            ["📢 Qarzdorlarga ABOROT", "📢 E'lon Yuborish"],
            ["🔴 Ta'tilni YOQISH", "🟢 Ta'tilni O'CHIRISH"],
            ["📥 Tuman hisoboti (Excel)", "⬅️ Orqaga"]
        ];
    } else if (RESTRICTED_IDS.map(Number).includes(uid)) {
        buttons = [
            ["📢 E'lon Yuborish", "📥 Tuman hisoboti (Excel)"],
            ["⬅️ Orqaga"]
        ];
    }

    ctx.reply(`🔧 Admin Panel.`, Markup.keyboard(buttons).resize());
}

function handleProList(ctx) {
    const uid = Number(ctx.from.id);
    const superAdmins = SUPER_ADMIN_IDS.map(id => Number(id));

    if (superAdmins.includes(uid)) {
        let msg = "📋 <b>PRO USERLAR:</b>\n\n";
        Object.keys(db.users_db).forEach((uid, i) => {
            const u = db.users_db[uid];
            if (u.is_pro && new Date(u.pro_expire_date) > new Date()) msg += `${i + 1}. ${u.fio} (ID: <code>${uid}</code>) - ${u.school}\n`
        });
        ctx.replyWithHTML(msg || "Pro yo'q");
    }
}

module.exports = {
    showAdminPanel,
    handleProList
};

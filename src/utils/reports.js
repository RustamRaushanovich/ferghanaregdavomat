const { getFargonaDate } = require('./fargona');

/**
 * Formats the attendance report for Telegram
 * @param {Object} d - Attendance data
 * @param {boolean} isPro - Whether the user/school is PRO
 * @param {string} source - 'bot' or 'web'
 */
function formatAttendanceReport(d, isPro, source) {
    const totalAbsent = d.total_absent || (parseInt(d.sababli_jami || d.sababli_total || 0) + parseInt(d.sababsiz_jami || d.sababsiz_total || 0));
    const percent = d.total_students > 0 ? (((d.total_students - totalAbsent) / d.total_students) * 100).toFixed(1) : 0;

    const emoji = percent >= 95 ? "🟢" : (percent >= 90 ? "🟡" : "🔴");
    const proBadge = isPro ? "✨ <b>PREMIUM</b>" : "🔹 Standart";

    // Header based on source
    const header = source === 'web'
        ? "🌐 <b>WEB DASHBOARD HISOBOTI</b>"
        : "🤖 <b>BOT INTEGRATSIYASI</b>";

    // Phone masking
    const clean = (d.phone || '').replace(/\D/g, '');
    const maskedPhone = clean.length >= 9 ? `+998 ** *** ${clean.slice(-4)}` : (d.phone || 'Noma\'lum');

    const sababli = d.sababli_jami || d.sababli_total || 0;
    const sababsiz = d.sababsiz_jami || d.sababsiz_total || 0;

    return `🏢 <b>DARALATALANGAN HISOBOT</b>\n` +
        `━━━━━━━━━━━━━━━\n` +
        `${header}\n\n` +
        `📍 <b>Hudud:</b> ${d.district}\n` +
        `🏫 <b>Muassasa:</b> ${d.school}\n\n` +
        `${emoji} <b>Davomat: ${percent}%</b>\n` +
        `👥 Jami o'quvchilar: <b>${d.total_students}</b>\n` +
        `🎒 Sinflar soni: <b>${d.classes_count}</b>\n\n` +
        `✅ Sababli: ${sababli}\n` +
        `🚫 Sababsiz: <b>${sababsiz}</b>\n` +
        `📉 Jami kelmagan: ${totalAbsent}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 Mas'ul: <b>${d.fio}</b>\n` +
        `📞 Aloqa: ${maskedPhone}\n` +
        `💎 Maqom: ${proBadge}\n\n` +
        `📅 <i>Sana: ${getFargonaDate()}</i>`;
}

module.exports = { formatAttendanceReport };

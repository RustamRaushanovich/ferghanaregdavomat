const { getFargonaTime } = require('./fargona');

/**
 * Formats the attendance report for Telegram
 * @param {Object} d - Attendance data
 * @param {boolean} isPro - Whether the user/school is PRO
 * @param {string} source - 'bot' or 'web'
 */
function formatAttendanceReport(d, isPro, source) {
    const totalAbsent = d.total_absent || (parseInt(d.sababli_jami || d.sababli_total || 0) + parseInt(d.sababsiz_jami || d.sababsiz_total || 0));
    const percent = d.total_students > 0 ? (((d.total_students - totalAbsent) / d.total_students) * 100).toFixed(1) : 0;

    const statusLabel = isPro ? "(PRO ✨)" : "(Oddiy)";
    const sourceLabel = source === 'web' ? "🌐 <b>WEB SAHIFA ORQALI KIRITILDI</b>" : "🤖 <b>BOT ORQALI KIRITILDI</b>";

    // Mask phone logic
    const clean = (d.phone || '').replace(/\D/g, '');
    let maskedPhone = d.phone;
    if (clean.length >= 9) {
        maskedPhone = `+998 ***** ${clean.slice(-4)}`;
    }

    const sababli = d.sababli_jami || d.sababli_total || 0;
    const sababsiz = d.sababsiz_jami || d.sababsiz_total || 0;

    return `${sourceLabel}\n\n` +
        `📍 <b>${d.district}, ${d.school}</b>\n` +
        `📊 Davomat ko'rsatkichi: <b>${percent} %</b> ${statusLabel}\n` +
        `🎒 Jami sinflar soni: ${d.classes_count}\n` +
        `👥 Jami o'quvchilar: ${d.total_students}\n` +
        `✅ Sababli kelmaganlar: ${sababli}\n` +
        `🚫 Sababsiz kelmaganlar: ${sababsiz}\n` +
        `📉 Jami kelmaganlar: ${totalAbsent}\n` +
        `☎️ Tel: ${maskedPhone}\n` +
        `👤 Mas'ul: ${d.fio}`;
}

module.exports = { formatAttendanceReport };

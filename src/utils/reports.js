const { getFargonaTime } = require('./fargona');

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Formats the attendance report for Telegram
 * @param {Object} d - Attendance data
 * @param {boolean} isPro - Whether the user/school is PRO
 * @param {string} source - 'bot' or 'web'
 */
function formatAttendanceReport(d, isPro, source) {
    const totalAbsent = d.total_absent || (parseInt(d.sababli_jami || d.sababli_total || 0) + parseInt(d.sababsiz_jami || d.sababsiz_total || 0));
    const totalStudents = parseInt(d.total_students) || 0;
    const percent = totalStudents > 0 ? (((totalStudents - totalAbsent) / totalStudents) * 100).toFixed(1) : 0;

    const statusLabel = isPro ? "(PRO ✨)" : "(Oddiy)";
    const sourceLabel = source === 'web' ? "🌐 <b>WEB SAHIFA ORQALI KIRITILDI</b>" : "🤖 <b>BOT ORQALI KIRITILDI</b>";

    // Mask phone logic
    const clean = (d.phone || '').replace(/\D/g, '');
    let maskedPhone = d.phone || '-';
    if (clean.length >= 9) {
        maskedPhone = `+998 ***** ${clean.slice(-4)}`;
    }

    const sababli = d.sababli_jami || d.sababli_total || 0;
    const sababsiz = d.sababsiz_jami || d.sababsiz_total || 0;

    const district = escapeHtml(d.district);
    const school = escapeHtml(d.school);
    const fio = escapeHtml(d.fio);

    return `${sourceLabel}\n\n` +
        `📍 <b>${district}, ${school}</b>\n` +
        `📊 Davomat ko'rsatkichi: <b>${percent} %</b> ${statusLabel}\n` +
        `🎒 Jami sinflar soni: ${d.classes_count || 0}\n` +
        `👥 Jami o'quvchilar: ${totalStudents}\n` +
        `✅ Sababli kelmaganlar: ${sababli}\n` +
        `🚫 Sababsiz kelmaganlar: ${sababsiz}\n` +
        `📉 Jami kelmaganlar: ${totalAbsent}\n` +
        `☎️ Tel: ${maskedPhone}\n` +
        `👤 Mas'ul: ${fio}`;
}

module.exports = { formatAttendanceReport, escapeHtml };

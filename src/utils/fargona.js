const moment = require('moment-timezone');

const UZB_TIMEZONE = 'Asia/Tashkent';

/**
 * Get current moment in Uzbekistan timezone (UTC+5)
 */
function getUzbMoment() {
    return moment().tz(UZB_TIMEZONE);
}

/**
 * Helper to get Date object forced to Farg'ona / Tashkent Timezone (+05:00)
 */
function getFargonaTime() {
    return getUzbMoment().toDate();
}

/**
 * Returns ISO-like string or formatted string in Tashkent timezone: "YYYY-MM-DD HH:mm:ss"
 */
function getFargonaDateTimeString(date) {
    if (date) {
        return moment(date).tz(UZB_TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    }
    return getUzbMoment().format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Formatted human-readable date & time for Uzbekistan: "DD.MM.YYYY HH:mm"
 */
function formatUzbDateTime(date) {
    if (!date) return '';
    return moment(date).tz(UZB_TIMEZONE).format('DD.MM.YYYY HH:mm');
}

/**
 * Formatted date: "YYYY-MM-DD"
 */
function getFargonaDateString() {
    return getUzbMoment().format('YYYY-MM-DD');
}

module.exports = {
    getFargonaTime,
    getTashkentTime: getFargonaTime,
    getUzbMoment,
    getFargonaDateTimeString,
    formatUzbDateTime,
    getFargonaDateString,
    UZB_TIMEZONE
};


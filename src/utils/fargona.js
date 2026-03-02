/**
 * Helper to get Date object forced to Farg'ona Timezone (+05:00)
 * Note: This creates a "fake" local date object for formatting purposes.
 */
function getFargonaTime() {
    const now = new Date();
    const fargonaOffset = 5 * 60; // Farg'ona is UTC+5
    const localOffset = now.getTimezoneOffset();
    const fargonaTime = new Date(now.getTime() + (fargonaOffset + localOffset) * 60000);
    return fargonaTime;
}

/**
 * Robustly returns YYYY-MM-DD string for Farg'ona timezone (NOW)
 */
function getFargonaDate() {
    const fDate = getFargonaTime();
    const year = fDate.getFullYear();
    const month = String(fDate.getMonth() + 1).padStart(2, '0');
    const day = String(fDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formats any Date object or string to YYYY-MM-DD using local (server) components
 * but intended for Farg'ona logical dates.
 */
function formatDate(date) {
    if (!date) return getFargonaDate();
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

module.exports = {
    getFargonaTime,
    getFargonaDate,
    formatDate,
    getTashkentTime: getFargonaTime
};

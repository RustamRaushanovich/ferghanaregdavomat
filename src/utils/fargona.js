/**
 * Helper to get Date object forced to Farg'ona Timezone (+05:00)
 */
function getFargonaTime() {
    const now = new Date();
    const fargonaOffset = 5 * 60; // Farg'ona is UTC+5
    const localOffset = now.getTimezoneOffset();
    const fargonaTime = new Date(now.getTime() + (fargonaOffset + localOffset) * 60000);
    return fargonaTime;
}

module.exports = { getFargonaTime, getTashkentTime: getFargonaTime }; // Keep alias for compatibility during migration

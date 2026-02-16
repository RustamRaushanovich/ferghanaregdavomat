const topicsConfig = require('../config/topics');
const TOPICS = topicsConfig.getTopics();

/**
 * Normalizes string for comparison (removes различные variants of apostrophes, trim, lowercase)
 */
function normalizeKey(str) {
    if (!str) return '';
    return str.toString()
        .replace(/['’‘`]/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

/**
 * Finds topic ID by district name (robust matching)
 */
function getTopicId(districtName) {
    if (!districtName) return null;

    const normName = normalizeKey(districtName);
    const keys = Object.keys(TOPICS);

    // 1. Direct match (Fast)
    if (TOPICS[districtName]) return TOPICS[districtName];

    // 2. Normalized match
    const foundKey = keys.find(k => normalizeKey(k) === normName);
    if (foundKey) return TOPICS[foundKey];

    // 3. Partial match (Backup)
    const partialKey = keys.find(k => normalizeKey(k).includes(normName) || normName.includes(normalizeKey(k)));
    if (partialKey) return TOPICS[partialKey];

    return null;
}

module.exports = {
    normalizeKey,
    getTopicId,
    TOPICS
};

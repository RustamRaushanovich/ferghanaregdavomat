require('dotenv').config();

module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    GOOGLE_SCRIPT_URL: process.env.GOOGLE_SCRIPT_URL,
    REPORT_GROUP_ID: process.env.REPORT_GROUP_ID || '-1003662758005',
    SUPER_ADMIN_IDS: [65002404, 786314811, 5310405293],
    SPECIALIST_IDS: [5310405293],
    RESTRICTED_IDS: [
        5807811746, 922449047, 5547706955, 8544693602, 1969769846, 341362677, 6229419604, 595501640,
        503222829, 8145453879, 1894911241, 6822495768, 271593039, 583173715, 345359050,
        1130890451, 309212107, 104416763, 7862384262
    ],
    DISTRICT_ADMINS: {
        5807811746: "Dang‘ara tumani",
        922449047: "Beshariq tumani",
        5547706955: "Buvayda tumani",
        8544693602: "So‘x tumani",
        1969769846: "Rishton tumani",
        341362677: "Yozyovon tumani",
        6229419604: "Oltiariq tumani",
        595501640: "Toshloq tumani",
        503222829: "Qo‘shtepa tumani",
        8145453879: "Bag‘dod tumani",
        1894911241: "Furqat tumani",
        6822495768: "Marg‘ilon shahri",
        271593039: "O‘zbekiston tumani",
        583173715: "Quvasoy shahri",
        345359050: "Farg‘ona shahri",
        1130890451: "Qo‘qon shahri",
        309212107: "Quva tumani",
        104416763: "Farg‘ona tumani",
        7862384262: "Uchko‘prik tumani"
    },
    get ALL_ADMINS() {
        return [...this.SUPER_ADMIN_IDS, ...this.SPECIALIST_IDS, ...this.RESTRICTED_IDS];
    }
};

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
    DISTRICT_HEADS: {
        "Farg‘ona shahri": { name: "A.Azizov", phone: "+998 90 123 45 67" },
        "Marg‘ilon shahri": { name: "M.Karimov", phone: "+998 91 222 33 44" },
        "Qo‘qon shahri": { name: "O.Soliev", phone: "+998 93 456 78 90" },
        "Quvasoy shahri": { name: "B.Aliev", phone: "+998 94 111 22 33" },
        "Beshariq tumani": { name: "S.Usmonov", phone: "+998 90 555 66 77" },
        "Bag‘dod tumani": { name: "J.Xolmatov", phone: "+998 91 777 88 99" },
        "Uchko‘prik tumani": { name: "R.Rahimov", phone: "+998 93 999 00 11" },
        "Qo‘shtepa tumani": { name: "D.Ergashev", phone: "+998 94 444 55 66" },
        "Farg‘ona tumani": { name: "G‘.Murodov", phone: "+998 90 222 11 00" },
        "O‘zbekiston tumani": { name: "U.Sultonov", phone: "+998 91 333 44 55" },
        "Dang‘ara tumani": { name: "Z.Islomov", phone: "+998 93 666 77 88" },
        "Rishton tumani": { name: "E.Mo'minov", phone: "+998 94 888 99 00" },
        "So‘x tumani": { name: "Q.Sodiqov", phone: "+998 90 000 11 22" },
        "Toshloq tumani": { name: "X.Jo'rayev", phone: "+998 91 111 22 33" },
        "Oltiariq tumani": { name: "P.Toshkentov", phone: "+998 93 222 33 44" },
        "Furqat tumani": { name: "L.G'ofurov", phone: "+998 94 333 44 55" },
        "Buvayda tumani": { name: "K.Nurmatov", phone: "+998 90 444 55 66" },
        "Quva tumani": { name: "M.Abdullaev", phone: "+998 91 555 66 77" },
        "Yozyovon tumani": { name: "F.Xasanov", phone: "+998 93 777 88 99" }
    },
    get ALL_ADMINS() {
        return [...this.SUPER_ADMIN_IDS, ...this.SPECIALIST_IDS, ...this.RESTRICTED_IDS];
    }
};

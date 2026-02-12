const { Telegraf, Markup, session, Scenes } = require('telegraf');
const db = require('./src/database/db');
require('dotenv').config();

const { getSchools } = require('./src/services/sheet');
const topicsConfig = require('./src/config/topics');
const { normalizeKey } = require('./src/utils/topics');
const fs = require('fs');
const path = require('path');

// Parent Bot Instance
const parentBot = new Telegraf(process.env.PARENT_BOT_TOKEN || process.env.BOT_TOKEN);
const PARENT_LOGO = path.join(__dirname, 'assets', 'parents_logo.png');

const moment = require('moment');
require('moment/locale/uz-latn');
require('moment/locale/ru');

// Helper to get formatted date string
function getDateString(lang) {
    const m = moment();
    const daysUz = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
    const daysRu = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    const monthsUz = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
    const monthsUzCyr = ["январ", "феврал", "март", "апрел", "май", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"];

    if (lang === 'uz_cyr') {
        const days = ["Якшанба", "Душанба", "Сешанба", "Чоршанба", "Пайшанба", "Жума", "Шанба"];
        return `📅 Бугун: ${days[m.day()]}, ${m.date()}-${monthsUzCyr[m.month()]} ${m.year()}-йил`;
    } else if (lang === 'ru') {
        m.locale('ru');
        // Example: Четверг, 12 февраля 2026 года
        return `📅 Сегодня: ${daysRu[m.day()]}, ${m.date()} ${m.format('MMMM')} ${m.year()} года`;
    } else {
        return `📅 Bugun: ${daysUz[m.day()]}, ${m.date()}-${monthsUz[m.month()]} ${m.year()}-yil`;
    }
}

function getWishes(lang) {
    if (lang === 'uz_cyr') return "✨ Кунингиз хайрли ва баракали ўтсин!";
    if (lang === 'ru') return "✨ Желаем вам доброго и продуктивного дня!";
    return "✨ Kuningiz xayrli va barakali o'tsin!";
}

// Translations
const STRINGS = {
    uz_lat: {
        welcome: "🛡 <b>\"Davomat Ota-onalar Nazorati\" tizimiga xush kelibsiz!</b>\n\n" +
            "🛑 <b>DIQQAT:</b> Ushbu tizim faqat Farg'ona viloyatidagi <b>davlat umumta'lim maktablari</b> uchun amal qiladi.\n\n" +
            "⚠️ Xususiy maktablar hamda PIMA (Prezident, ijod va ixtisoslashtirilgan maktablar agentligi) tizimidagi maktab o'quvchilari haqida ma'lumotlar ushbu botga kiritilmaydi.",
        ask_phone: "Ro'yxatdan o'tish uchun telefon raqamingizni yuboring:",
        btn_phone: "📱 Raqamni yuborish",
        ask_fio: "👤 Ism-familiyangizni kiriting:",
        ask_child_count: "👨‍👩‍👧‍👦 Farg‘ona viloyati umumta'lim maktablarida o‘qiydigan nechta farzandigiz bor?\n<i>(Raqam yozib yuboring, masalan: 1, 2, 3...)</i>",
        ask_child_name: "👶 <b>{n}-farzandingizning</b> ism-familiyasini kiriting:",
        ask_district: "📍 <b>{n}-farzandingiz ({name})</b> o'qiydigan hududni tanlang:",
        ask_school: "🏫 <b>{n}-farzandingiz ({name})</b> o'qiydigan maktabni tanlang:",
        ask_all_same: "❓ Qolgan barcha farzandlaringiz ham <b>{school}</b> maktabida o'qiydimi?",
        btn_yes: "✅ Ha, barchasi shu yerda",
        btn_no: "❌ Yo'q, boshqa maktabda",
        btn_back: "⬅️ Ortga",
        success: "✅ <b>Muvaffaqiyatli!</b>\n\nSiz jami {count} ta farzand ulanishiga ega bo'ldingiz. Farzandlaringiz dars qoldirsa, sizga xabar keladi.",
        main_menu: "Asosiy menyu:",
        btn_add: "➕ Yangi farzand qo'shish",
        btn_my_schools: "📋 Mening maktablarim",
        btn_profile: "👤 Profilim",
        btn_lang: "🌐 Tilni o'zgartirish"
    },
    uz_cyr: {
        welcome: "🛡 <b>\"Давомат Ота-оналар Назорати\" тизимига хуш келибсиз!</b>\n\n" +
            "🛑 <b>ДИҚҚАТ:</b> Ушбу тизим фақат Фарғона вилоятидаги <b>давлат умумтаълим мактаблари</b> учун амал қилади.\n\n" +
            "⚠️ Хусусий мактаблар ҳамда ПИМА (Президент, ижод ва ихтисослаштирилган мактаблар агентлиги) тизимидаги мактаб ўқувчилари ҳақида маълумотлар ушбу ботга киритилмайди.",
        ask_phone: "Рўйхатдан ўтиш учун телефон рақамингизни юборинг:",
        btn_phone: "📱 Рақамни юбориш",
        ask_fio: "👤 Исм-фамилиянгизни киритинг:",
        ask_child_count: "👨‍👩‍👧‍👦 Фарғона вилояти умумтаълим мактабларида ўқийдиган нечта фарзандигиз бор?\n<i>(Рақам ёзиб юборинг, масалан: 1, 2, 3...)</i>",
        ask_child_name: "👶 <b>{n}-фарзандингизнинг</b> исм-фамилиясини киритинг:",
        ask_district: "📍 <b>{n}-фарзандингиз ({name})</b> ўқийдиган ҳудудни танланг:",
        ask_school: "🏫 <b>{n}-фарзандингиз ({name})</b> ўқийдиган мактабни танланг:",
        ask_all_same: "❓ Қолган барча фарзандларингиз ҳам <b>{school}</b> мактабида ўқийдими?",
        btn_yes: "✅ Ҳа, барчаси шу ерда",
        btn_no: "❌ Йўқ, бошқа мактабда",
        btn_back: "⬅️ Ортга",
        success: "✅ <b>Муваффақиятли!</b>\n\nСиз жами {count} та фарзанд уланишига эга бўлдингиз. Фарзандларингиз дарс қолдирса, сизга хабар келади.",
        main_menu: "Асосий меню:",
        btn_add: "➕ Янги фарзанд қўшиш",
        btn_my_schools: "📋 Менинг мактабларим",
        btn_profile: "👤 Профилим",
        btn_lang: "🌐 Тилни ўзгартириш"
    },
    ru: {
        welcome: "🛡 <b>Добро пожаловать в систему \"Родительский контроль посещаемости\"!</b>\n\n" +
            "🛑 <b>ВНИМАНИЕ:</b> Данная система работает только для <b>государственных общеобразовательных школ</b> Ферганской области.\n\n" +
            "⚠️ Ученики частных школ и школ системы <b>ПИМА (Агентство президентских, творческих и специализированных школ)</b> НЕ внесены в данную базу.",
        ask_phone: "Для регистрации отправьте ваш номер телефона, нажав кнопку ниже:",
        btn_phone: "📱 Отправить номер",
        ask_fio: "👤 Введите ваше Имя и Фамилию:",
        ask_child_count: "👨‍👩‍👧‍👦 Сколько ваших детей учатся в общеобразовательных школах Ферганской области?\n<i>(Отправьте число, например: 1, 2, 3...)</i>",
        ask_child_name: "👶 Введите имя и фамилию вашего <b>{n}-го ребенка</b>:",
        ask_district: "📍 Выберите район, где учится ваш <b>{n}-й ребенок ({name})</b>:",
        ask_school: "🏫 Выберите школу вашего <b>{n}-го ребенка ({name})</b>:",
        ask_all_same: "❓ Все ли остальные ваши дети учатся в школе <b>{school}</b>?",
        btn_yes: "✅ Да, все здесь",
        btn_no: "❌ Нет, в другой школе",
        btn_back: "⬅️ Назад",
        success: "✅ <b>Успешно!</b>\n\nУ вас теперь есть доступ к данным {count} детей. Если кто-то из них пропустит урок, вы получите уведомление.",
        main_menu: "Главное меню:",
        btn_add: "➕ Добавить ребенка",
        btn_my_schools: "📋 Мои школы",
        btn_profile: "👤 Профиль",
        btn_lang: "🌐 Сменить язык"
    }
};



const TOPICS = topicsConfig.getTopics();
const districts = Object.keys(TOPICS).filter(d => d !== "Test rejimi" && d !== "MMT Boshqarma");

// Wizard Logic
const registrationWizard = new Scenes.WizardScene(
    'parent_reg_wizard',
    // 1. Language Selection
    async (ctx) => {
        // Always start with language choice, no text needed, just buttons
        await ctx.reply("👇", Markup.keyboard([
            ["🇺🇿 O'zbekcha", "🇺🇿 Ўзбекча"],
            ["🇷🇺 Русский"]
        ]).resize());
        return ctx.wizard.next();
    },
    // 2. Welcome & Phone
    async (ctx) => {
        const text = ctx.message.text;
        const langMap = { "🇺🇿 O'zbekcha": "uz_lat", "🇺🇿 Ўзбекча": "uz_cyr", "🇷🇺 Русский": "ru" };
        const selectedLang = langMap[text] || "uz_lat";

        ctx.wizard.state.lang = selectedLang;
        const s = STRINGS[selectedLang];

        // Show Logo + Welcome + Date/Wishes
        const dateStr = getDateString(selectedLang);
        const wishes = getWishes(selectedLang);
        const fullMsg = `${s.welcome}\n\n${dateStr}\n${wishes}\n\n${s.ask_phone}`;

        // Save lang to DB immediately if possible, or just carry in state
        // We'll use the consistent uz_lat for internal data later

        if (fs.existsSync(PARENT_LOGO)) {
            await ctx.replyWithPhoto({ source: PARENT_LOGO }, {
                caption: fullMsg,
                parse_mode: 'HTML',
                ...Markup.keyboard([
                    [Markup.button.contactRequest(s.btn_phone)],
                    [s.btn_back, "🏠 Asosiy menyu"]
                ]).resize()
            });
        } else {
            await ctx.replyWithHTML(fullMsg, Markup.keyboard([
                [Markup.button.contactRequest(s.btn_phone)],
                [s.btn_back, "🏠 Asosiy menyu"]
            ]).resize());
        }
        return ctx.wizard.next();
    },
    // 3. FIO
    async (ctx) => {
        const text = ctx.message.text;
        const s = STRINGS[ctx.wizard.state.lang];

        if (text === "🏠 Asosiy menyu" || text === "🏠 Главное меню") {
            await ctx.scene.leave();
            // Return to main menu logic (simplified)
            return ctx.reply("🏠 Asosiy menyu / Главное меню", Markup.keyboard([
                [s.btn_add], [s.btn_my_schools, s.btn_profile], [s.btn_lang]
            ]).resize());
        }

        if (text === s.btn_back || text === "⬅️ Ortga" || text === "⬅️ Ортга" || text === "⬅️ Назад") {
            await ctx.reply("Tilni tanlang / Выберите язык:", Markup.keyboard([
                ["🇺🇿 O'zbekcha", "🇺🇿 Ўзбекча"],
                ["🇷🇺 Русский"]
            ]).resize());
            return ctx.wizard.back();
        }

        if (!ctx.message.contact && text !== "🏠 Asosiy menyu") {
            return ctx.reply(s.ask_phone, Markup.keyboard([
                [Markup.button.contactRequest(s.btn_phone)],
                [s.btn_back, "🏠 Asosiy menyu"]
            ]).resize());
        }
        ctx.wizard.state.phone = ctx.message.contact.phone_number.replace(/\D/g, '');
        // const s = STRINGS[ctx.wizard.state.lang];
        await ctx.reply(s.ask_fio, Markup.keyboard([
            [s.btn_back, "🏠 Asosiy menyu"]
        ]).resize());
        return ctx.wizard.next();
    },
    // 4. Child Count
    async (ctx) => {
        const text = ctx.message.text;
        const s = STRINGS[ctx.wizard.state.lang];

        if (text === "🏠 Asosiy menyu" || text === "🏠 Главное меню") {
            await ctx.scene.leave();
            return ctx.reply("🏠 Asosiy menyu / Главное меню", Markup.keyboard([
                [s.btn_add], [s.btn_my_schools, s.btn_profile], [s.btn_lang]
            ]).resize());
        }

        if (text === s.btn_back || text === "⬅️ Ortga" || text === "⬅️ Ортга" || text === "⬅️ Назад") {
            return ctx.wizard.back();
        }

        ctx.wizard.state.fio = text;
        // Manual input for count
        await ctx.replyWithHTML(s.ask_child_count, Markup.keyboard([
            [s.btn_back, "🏠 Asosiy menyu"]
        ]).resize());

        ctx.wizard.state.subs = [];
        ctx.wizard.state.current_child = 1;
        return ctx.wizard.next();
    },
    // 5. Subscription Loop: District Selection (Formerly Step 6)
    async (ctx) => {
        const dist = ctx.message.text;

        // Validation logic
        const validDist = districts.find(d => normalizeKey(d) === normalizeKey(dist));
        if (!validDist) {
            const districtButtons = [];
            for (let i = 0; i < districts.length; i += 2) districtButtons.push(districts.slice(i, i + 2));
            return ctx.reply("Iltimos, quyidagi tugmalardan hududni tanlang / Пожалуйста, выберите район:", Markup.keyboard(districtButtons).resize());
        }

        ctx.wizard.state.temp_dist = validDist;
        const s = STRINGS[ctx.wizard.state.lang];
        await ctx.reply("⌛️ Maktablar yuklanmoqda...");

        const schools = await getSchools(validDist);
        const btns = [];
        for (let i = 0; i < schools.length; i += 2) btns.push(schools.slice(i, i + 2));

        await ctx.replyWithHTML(s.ask_school.replace('{n}', ctx.wizard.state.current_child).replace('({name})', ''), Markup.keyboard(btns).resize());
        return ctx.wizard.next();
    },
    // 6. Subscription Loop: School Selection (Formerly Step 7)
    async (ctx) => {
        const school = ctx.message.text;
        const s = STRINGS[ctx.wizard.state.lang];

        ctx.wizard.state.subs.push({
            name: "O'quvchi", // Placeholder or empty since we don't ask name
            district: ctx.wizard.state.temp_dist,
            school: school
        });

        if (ctx.wizard.state.current_child < ctx.wizard.state.total_children) {
            // Ask for next child's district directly
            ctx.wizard.state.current_child++;
            const districtButtons = [];
            for (let i = 0; i < districts.length; i += 2) districtButtons.push(districts.slice(i, i + 2));

            await ctx.replyWithHTML(s.ask_district.replace('{n}', ctx.wizard.state.current_child).replace('({name})', ''), Markup.keyboard(districtButtons).resize());
            // Go back to Step 5 (District Handler)
            // Step 5 is index 4 (0,1,2,3,4)
            ctx.wizard.selectStep(4);
            return;
        } else {
            return finalize(ctx);
        }
    },
    // 7. Subscription Loop: School Selection
    async (ctx) => {
        const dist = ctx.message.text;
        // Validate against districts list (which is in uz_lat)
        const validDist = districts.find(d => normalizeKey(d) === normalizeKey(dist));
        if (!validDist) return ctx.reply("Tugmalardan tanlang / Выберите из кнопок");

        ctx.wizard.state.temp_dist = validDist; // Keep data uniform (uz_lat)
        const s = STRINGS[ctx.wizard.state.lang];
        await ctx.reply("⌛️...");

        const schools = await getSchools(validDist);
        const btns = [];
        for (let i = 0; i < schools.length; i += 2) btns.push(schools.slice(i, i + 2));

        await ctx.replyWithHTML(s.ask_school.replace('{n}', ctx.wizard.state.current_child).replace('{name}', ctx.wizard.state.temp_name), Markup.keyboard(btns).resize());
        return ctx.wizard.next();
    },
    // 8. Decision: More schools?
    async (ctx) => {
        const school = ctx.message.text;
        const s = STRINGS[ctx.wizard.state.lang];
        // Basic check if school exists in list (optional but good)

        ctx.wizard.state.subs.push({
            name: ctx.wizard.state.temp_name,
            district: ctx.wizard.state.temp_dist,
            school: school
        });

        if (ctx.wizard.state.current_child < ctx.wizard.state.total_children) {
            await ctx.replyWithHTML(s.ask_all_same.replace('{school}', school), Markup.keyboard([[s.btn_yes, s.btn_no]]).resize());
            return ctx.wizard.next();
        } else {
            return finalize(ctx);
        }
    },
    // 9. Handle Decision
    async (ctx) => {
        const choice = ctx.message.text;
        const s = STRINGS[ctx.wizard.state.lang];

        if (choice === s.btn_yes) {
            ctx.wizard.state.current_child++;
            await ctx.replyWithHTML(s.ask_child_name.replace('{n}', ctx.wizard.state.current_child), Markup.removeKeyboard());
            ctx.wizard.state.collecting_names_only = true;
            ctx.wizard.selectStep(5);
            return;
        } else {
            ctx.wizard.state.collecting_names_only = false;
            ctx.wizard.state.current_child++;
            await ctx.replyWithHTML(s.ask_child_name.replace('{n}', ctx.wizard.state.current_child), Markup.removeKeyboard());
            ctx.wizard.selectStep(5);
            return;
        }
    }
);

async function finalize(ctx) {
    const state = ctx.wizard.state;
    const s = STRINGS[state.lang];
    const chat_id = ctx.chat.id;

    let userData = db.users_db[`parent_${chat_id}`] || {
        role: 'parent',
        phone: state.phone,
        fio: state.fio,
        lang: state.lang, // View preference
        chat_id: chat_id,
        subscriptions: []
    };

    userData.subscriptions = [...userData.subscriptions, ...state.subs];
    db.updateUserDb(`parent_${chat_id}`, userData);

    await ctx.replyWithHTML(s.success.replace('{count}', userData.subscriptions.length),
        Markup.keyboard([[s.btn_add], [s.btn_my_schools, s.btn_profile]]).resize());
    return ctx.scene.leave();
}

const stage = new Scenes.Stage([registrationWizard]);
parentBot.use(session());
parentBot.use(stage.middleware());

parentBot.start(async (ctx) => {
    try { await ctx.scene.leave(); } catch (e) { }

    // Always start with language selection for new users OR returning users resetting
    // Check if user exists to maybe greet them by name, but requested flow mandates lang selection first
    const user = db.users_db[`parent_${ctx.chat.id}`];

    // If user exists, we can skip straight to menu OR force re-select? 
    // User requested "Start -> Lang Select -> Logo/Greeting". 
    // So even if they exist, /start should probably show the menu or lang select? 
    // Usually /start on existing user shows Main Menu. Let's keep that but enable "Change Language" button.

    if (user && user.subscriptions && user.subscriptions.length > 0) {
        const lang = user.lang || "uz_lat";
        const s = STRINGS[lang] || STRINGS["uz_lat"];

        const dateStr = getDateString(lang);
        const wishes = getWishes(lang);
        const caption = `${s.main_menu}\n\n${dateStr}\n${wishes}`;

        const mainKeyboard = Markup.keyboard([[s.btn_add], [s.btn_my_schools, s.btn_profile], [s.btn_lang]]).resize();

        if (fs.existsSync(PARENT_LOGO)) {
            return ctx.replyWithPhoto({ source: PARENT_LOGO }, { caption: caption, ...mainKeyboard });
        }
        return ctx.reply(caption, mainKeyboard);
    }

    await ctx.reply("Tilni tanlang / Выберите язык:", Markup.keyboard([
        ["🇺🇿 O'zbekcha", "🇺🇿 Ўзбекча"],
        ["🇷🇺 Русский"]
    ]).resize());
    return ctx.scene.enter('parent_reg_wizard');
});

// --- Button Handlers ---

// 1. My Schools
parentBot.hears(['📋 Mening maktablarim', '📋 Менинг мактабларим', '📋 Мои школы'], async (ctx) => {
    const user = db.users_db[`parent_${ctx.chat.id}`];
    if (!user || !user.subscriptions || user.subscriptions.length === 0) {
        return ctx.reply("Siz hali hech qanday maktabga ulanmagansiz. / Вы еще не подписаны ни на одну школу.");
    }

    const s = STRINGS[user.lang || "uz_lat"];
    let msg = `<b>${s.btn_my_schools}:</b>\n\n`;

    user.subscriptions.forEach((sub, i) => {
        msg += `${i + 1}. <b>O'quvchi ${i + 1}</b>\n   📍 ${sub.district}, ${sub.school}\n\n`;
    });

    ctx.replyWithHTML(msg);
});

// 2. Profile
parentBot.hears(['👤 Profilim', '👤 Профилим', '👤 Профиль'], async (ctx) => {
    const user = db.users_db[`parent_${ctx.chat.id}`];
    if (!user) return ctx.reply("Profil topilmadi.");

    const s = STRINGS[user.lang || "uz_lat"];
    const msg = `<b>${s.btn_profile}</b>\n\n` +
        `👤 <b>F.I.SH:</b> ${user.fio}\n` +
        `📞 <b>Telefon:</b> +${user.phone}\n` +
        `🌐 <b>Til:</b> ${user.lang}\n` +
        `👶 <b>Farzandlar soni:</b> ${user.subscriptions ? user.subscriptions.length : 0} ta`;

    ctx.replyWithHTML(msg);
});

// 3. Add Child (Already handled by regex below, but ensuring explicit match)
parentBot.hears(['➕ Yangi farzand qo\'shish', '➕ Янги фарзанд қўшиш', '➕ Добавить ребенка'], (ctx) => ctx.scene.enter('parent_reg_wizard'));

// 4. Change Language
parentBot.hears(['🌐 Tilni o\'zgartirish', '🌐 Тилни ўзгартириш', '🌐 Сменить язык'], async (ctx) => {
    await ctx.reply("Tilni tanlang / Выберите язык:", Markup.keyboard([
        ["🇺🇿 O'zbekcha", "🇺🇿 Ўзбекча"],
        ["🇷🇺 Русский"]
    ]).resize());
    ctx.scene.enter('parent_reg_wizard'); // Re-enter wizard but looking for lang input? 
    // Actually wizard step 1 expects just button press. 
    // But wizard starts with step 1 (index 0). 
    // Step 1 handler replies with "Tilni tanlang..." and waits for next.
    // So if we just enter scene, it runs step 1 logic (replying).
    // But Step 1 handler is configured to REPLY first. 
    // Let's modify wizard to accept text in step 1 if it matches lang?
    // Current wizard step 1 just replies and returns next.
    // Step 2 handles the text.
    // So just entering scene is fine, it will ask again.
});

// Handle Language Selection Text directly if outside wizard (edge case)
parentBot.hears(["🇺🇿 O'zbekcha", "🇺🇿 Ўзбекча", "🇷🇺 Русский"], async (ctx) => {
    // If caught here, it means user clicked lang button but wasn't in wizard.
    // Send them to wizard step 2 logic manually or just start wizard.
    ctx.scene.enter('parent_reg_wizard');
});

parentBot.hears(/Yangi farzand|Добавить|Янги/, (ctx) => ctx.scene.enter('parent_reg_wizard'));

if (process.env.PARENT_BOT_TOKEN) {
    parentBot.launch({
        polling: { timeout: 60 }
    }).then(() => {
        console.log("✅ Professional Parent Bot started!");
    }).catch(e => {
        console.error("❌ Parent Bot Startup Error:", e.message);
    });
} else {
    console.warn("⚠️ Parent Bot skipped: PARENT_BOT_TOKEN missing.");
}
parentBot.catch((err, ctx) => {
    console.error(`Parent Bot Error: ${err}`);
});

module.exports = parentBot;

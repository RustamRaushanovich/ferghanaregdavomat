const { Telegraf, Markup, session, Scenes } = require('telegraf');
const db = require('./src/database/db');
require('dotenv').config();

const { getSchools } = require('./src/services/sheet');
const topicsConfig = require('./src/config/topics');
const { normalizeKey } = require('./src/utils/topics');

// Parent Bot Instance
const parentBot = new Telegraf(process.env.PARENT_BOT_TOKEN || process.env.BOT_TOKEN);

// Translations
const STRINGS = {
    uz_lat: {
        welcome: "🛡 <b>\"Davomat Ota-onalar Nazorati\" tizimiga xush kelibsiz!</b>\n\n" +
            "🛑 <b>DIQQAT:</b> Ushbu tizim faqat Farg'ona viloyatidagi <b>davlat umumta'lim maktablari</b> uchun amal qiladi.\n\n" +
            "⚠️ Xususiy maktablar hamda PIMA (Prezident, ijod va ixtisoslashtirilgan maktablar agentligi) tizimidagi maktab o'quvchilari haqida ma'lumotlar ushbu botga kiritilmaydi.",
        ask_phone: "Ro'yxatdan o'tish uchun telefon raqamingizni yuboring:",
        btn_phone: "📱 Raqamni yuborish",
        ask_fio: "👤 Ism-familiyangizni kiriting:",
        ask_child_count: "👨‍👩‍👧‍👦 Farg‘ona viloyati umumta'lim maktablarida o‘qiydigan nechta farzandigiz bor?",
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
        ask_child_count: "👨‍👩‍👧‍👦 Фарғона вилояти умумтаълим мактабларида ўқийдиган нечта фарзандигиз бор?",
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
            "⚠️ Информация об учащихся частных школ и школ системы ПИМА (Агентство президентских, творческих и специализированных школ) в данный бот не вносится.",
        ask_phone: "Для регистрации отправьте ваш номер телефона:",
        btn_phone: "📱 Отправить номер",
        ask_fio: "👤 Введите ваше Имя и Фамилию:",
        ask_child_count: "👨‍👩‍👧‍👦 Сколько ваших детей учатся в школах Ферганской области?",
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
        await ctx.reply("Tilni tanlang / Выберите язык:", Markup.keyboard([
            ["🇺🇿 O'zbekcha", "🇺🇿 Ўзбекча", "🇷🇺 Русский"]
        ]).resize());
        return ctx.wizard.next();
    },
    // 2. Welcome & Phone
    async (ctx) => {
        const text = ctx.message.text;
        const langMap = { "🇺🇿 O'zbekcha": "uz_lat", "🇺🇿 Ўзбекча": "uz_cyr", "🇷🇺 Русский": "ru" };
        ctx.wizard.state.lang = langMap[text] || "uz_lat";

        const s = STRINGS[ctx.wizard.state.lang];
        await ctx.replyWithHTML(s.welcome);
        await ctx.reply(s.ask_phone, Markup.keyboard([[Markup.button.contactRequest(s.btn_phone)]]).resize());
        return ctx.wizard.next();
    },
    // 3. FIO
    async (ctx) => {
        if (!ctx.message.contact) return ctx.reply("Error: Contact required.");
        ctx.wizard.state.phone = ctx.message.contact.phone_number.replace(/\D/g, '');
        const s = STRINGS[ctx.wizard.state.lang];
        await ctx.reply(s.ask_fio, Markup.removeKeyboard());
        return ctx.wizard.next();
    },
    // 4. Child Count
    async (ctx) => {
        ctx.wizard.state.fio = ctx.message.text;
        const s = STRINGS[ctx.wizard.state.lang];
        await ctx.reply(s.ask_child_count, Markup.keyboard([['1', '2', '3', '4', '5+']]).resize());
        ctx.wizard.state.subs = [];
        ctx.wizard.state.current_child = 1;
        return ctx.wizard.next();
    },
    // 5. Subscription Loop: Ask Child Name
    async (ctx) => {
        const count = ctx.message.text;
        ctx.wizard.state.total_children = parseInt(count) || 1;
        const s = STRINGS[ctx.wizard.state.lang];

        await ctx.replyWithHTML(s.ask_child_name.replace('{n}', ctx.wizard.state.current_child));
        return ctx.wizard.next();
    },
    // 6. Subscription Loop: District Selection
    async (ctx) => {
        const name = ctx.message.text.trim();
        ctx.wizard.state.temp_name = name;
        const s = STRINGS[ctx.wizard.state.lang];

        if (ctx.wizard.state.collecting_names_only) {
            // Use same district/school as previous child
            const last = ctx.wizard.state.subs[ctx.wizard.state.subs.length - 1];
            ctx.wizard.state.subs.push({
                name: name,
                district: last.district,
                school: last.school
            });

            if (ctx.wizard.state.current_child < ctx.wizard.state.total_children) {
                ctx.wizard.state.current_child++;
                await ctx.replyWithHTML(s.ask_child_name.replace('{n}', ctx.wizard.state.current_child));
                return; // Stay in this step (6) to get next name
            } else {
                return finalize(ctx);
            }
        }

        const districtButtons = [];
        for (let i = 0; i < districts.length; i += 2) districtButtons.push(districts.slice(i, i + 2));

        await ctx.replyWithHTML(s.ask_district.replace('{n}', ctx.wizard.state.current_child).replace('{name}', ctx.wizard.state.temp_name),
            Markup.keyboard(districtButtons).resize());
        return ctx.wizard.next();
    },
    // 7. Subscription Loop: School Selection
    async (ctx) => {
        const dist = ctx.message.text;
        const validDist = districts.find(d => normalizeKey(d) === normalizeKey(dist));
        if (!validDist) return ctx.reply("Select from buttons.");

        ctx.wizard.state.temp_dist = validDist;
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
            ctx.wizard.selectStep(5); // Return to Step 6 handler (wait for name)
            return;
        } else {
            ctx.wizard.state.collecting_names_only = false;
            ctx.wizard.state.current_child++;
            await ctx.replyWithHTML(s.ask_child_name.replace('{n}', ctx.wizard.state.current_child), Markup.removeKeyboard());
            ctx.wizard.selectStep(5); // Return to Step 6 handler (wait for name)
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
        lang: state.lang,
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
    const user = db.users_db[`parent_${ctx.chat.id}`];
    if (user && user.subscriptions && user.subscriptions.length > 0) {
        const s = STRINGS[user.lang || "uz_lat"];
        return ctx.reply(s.main_menu, Markup.keyboard([[s.btn_add], [s.btn_my_schools, s.btn_profile]]).resize());
    }
    ctx.scene.enter('parent_reg_wizard');
});

parentBot.hears(/Yangi farzand|Добавить|Янги/, (ctx) => ctx.scene.enter('parent_reg_wizard'));

parentBot.launch().then(() => console.log("Professional Parent Bot started..."));

module.exports = parentBot;

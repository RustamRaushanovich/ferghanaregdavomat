const { Scenes, Markup } = require('telegraf');
const { getSchools, saveData, generatePdf } = require('../services/sheet');
const { getTopicId, normalizeKey } = require('../utils/topics');
const topicsConfig = require('../config/topics');
const db = require('../database/db');
const { checkTime } = require('../utils/time');
const { getFargonaTime } = require('../utils/fargona');
const { analyzeAttendancePhoto } = require('../services/ai');
const { generateBildirishnoma } = require('../services/pdf');
const { notifyParents } = require('../services/notifications');
const { formatAttendanceReport } = require('../utils/reports');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { generateBildirgi } = require('../utils/pdfGenerator');

const TOPICS = topicsConfig.getTopics();
const REPORT_GROUP_ID = process.env.REPORT_GROUP_ID || '-1003662758005';

// Tugmalar
const navButtons = () => Markup.keyboard([
    ["⬅️ Ortga", "🏠 Asosiy menyu"]
]).resize();

const districts = Object.keys(TOPICS);
const districtButtons = [];
for (let i = 0; i < districts.length; i += 2) districtButtons.push(districts.slice(i, i + 2));

function maskPhone(phone) {
    if (!phone) return "Kiritilmagan";
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length > 9) {
        return `+${clean.substring(0, 3)} ${clean.substring(3, 5)} *** ** ${clean.substring(clean.length - 2)}`;
    }
    return phone;
}

function checkNav(ctx) {
    if (ctx.message && ctx.message.text === "🏠 Asosiy menyu") {
        ctx.reply("🏠 Bosh sahifa.", Markup.keyboard([["Davomat kiritish"]]).resize());
        try { ctx.scene.leave(); } catch (e) { }
        return true;
    }
    if (ctx.message && ctx.message.text === "⬅️ Ortga") {
        if (ctx.wizard.cursor <= 0) {
            ctx.reply("Bekor qilindi.", Markup.keyboard([["Davomat kiritish"]]).resize());
            ctx.scene.leave();
        } else {
            ctx.wizard.back();
        }
        return true;
    }
    return false;
}

const attendanceWizard = new Scenes.WizardScene(
    'attendance_wizard',

    // 0. SMART START (Profile tekshirish + Vaqt)
    async (ctx) => {
        ctx.wizard.state.data = {};
        const uid = ctx.from.id;

        // Vaqt check (Admins skip time check if needed, but let's keep it simple)
        if (!checkTime(ctx, db.checkPro(uid))) return;

        const saved = db.users_db[uid];

        if (saved && saved.district && saved.school) {
            ctx.wizard.state.saved = saved;
            // Agar avval kiritgan bo'lsa, darhol tasdiqlashni so'raymiz
            await ctx.replyWithHTML(
                `👋 <b>Salom, ${saved.fio || ctx.from.first_name}!</b>\n\n🏫 Maktab: <b>${saved.school}</b> (${saved.district})\n\nMa'lumotlar to'g'rimi?`,
                Markup.keyboard([
                    ["✅ Ha, davom etamiz"],
                    ["🔄 Maktab/Tumanni o'zgartirish"],
                    ["🏠 Asosiy menyu"]
                ]).resize()
            );
            return ctx.wizard.next();
        } else {
            // Yangi foydalanuvchi - To'g'ridan-to'g'ri raqam so'rashga
            ctx.wizard.selectStep(2);
            return ctx.wizard.steps[2](ctx);
        }
    },

    // 1. CONFIRMATION OR REDIRECT
    async (ctx) => {
        if (checkNav(ctx)) return;
        const text = ctx.message.text;
        const s = ctx.wizard.state.saved;

        if (text === "✅ Ha, davom etamiz") {
            ctx.wizard.state.data = {
                phone: s.phone,
                fio: s.fio,
                district: s.district,
                school: s.school
            };
            await ctx.reply("🏫 <b>Jami sinflar sonini kiriting:</b>\n<i>(1-11 sinflar jami)</i>", { parse_mode: "HTML", ...navButtons() });
            return ctx.wizard.selectStep(7);
        } else if (text === "🔄 Maktab/Tumanni o'zgartirish") {
            // Agar faqat maktabni o'zgartirmoqchi bo'lsa, raqam/fioni saqlab qolamiz
            ctx.wizard.state.data.phone = s.phone;
            ctx.wizard.state.data.fio = s.fio;
            ctx.wizard.selectStep(4); // Skip to District
            return ctx.wizard.steps[4](ctx);
        } else {
            ctx.wizard.selectStep(2);
            return ctx.wizard.steps[2](ctx);
        }
    },

    // 2. PHONE REGISTRATION (For new users)
    async (ctx) => {
        if (checkNav(ctx)) return;

        await ctx.reply(
            `🌸 <b>Xush kelibsiz!</b>\nFarg'ona viloyati davomat tizimida ishlash uchun bir marta telefon raqamingizni tasdiqlashingiz kifoya.`,
            { parse_mode: 'HTML' }
        );

        await ctx.reply(
            "📱 <b>Telefon raqamingizni yuboring:</b>",
            {
                parse_mode: "HTML",
                ...Markup.keyboard([
                    [Markup.button.contactRequest("📱 Raqamni yuborish")],
                    ["🏠 Asosiy menyu"]
                ]).resize()
            }
        );
        return ctx.wizard.next();
    },


    // 3. FIO or AI PHOTO
    async (ctx) => {
        if (checkNav(ctx)) return;
        const uid = ctx.from.id;
        const isPro = ctx.wizard.state.forced_role === 'pro' || db.checkPro(uid);

        if (ctx.message && ctx.message.text === "📸 Rasm orqali kiritish (AI)") {
            if (!isPro) return ctx.reply("⛔️ Bu funksiya faqat PRO foydalanuvchilar uchun.");
            await ctx.reply("📸 <b>Davomat varaqasi yoki hisobot rasmini yuboring:</b>\n<i>(AI uni tahlil qilib, raqamlarni ajratib oladi)</i>", { parse_mode: 'HTML', ...navButtons() });
            ctx.wizard.state.ai_mode = true;
            return; // Stay in this step to wait for photo
        }

        if (ctx.wizard.state.ai_mode && ctx.message.photo) {
            if (!isPro) return ctx.reply("⛔️ Kechirasiz, sizda PRO ruxsati yo'q.");
            const waitMsg = await ctx.reply("⏳ <b>Rasm tahlil qilinmoqda, iltimos kuting...</b>", { parse_mode: 'HTML' });
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            try {
                const link = await ctx.telegram.getFileLink(photo.file_id);
                const aiData = await analyzeAttendancePhoto(link.href);

                await ctx.deleteMessage(waitMsg.message_id).catch(() => { });

                if (aiData) {
                    // Populate state with AI results
                    ctx.wizard.state.data.classes_count = null; // AI can't always guess classes
                    ctx.wizard.state.data.total_students = aiData.total_students || 0;
                    ctx.wizard.state.data.sababli_kasal = aiData.sababli_kasal || 0;
                    ctx.wizard.state.data.sababli_jami_others = aiData.sababli_jami_others || 0; // Simplified
                    ctx.wizard.state.data.sababsiz_jami = aiData.sababsiz_jami || 0;
                    if (aiData.fio) ctx.wizard.state.data.fio = aiData.fio;

                    await ctx.reply(`✅ <b>Ma'lumotlar aniqlandi:</b>\n\n👥 Jami: ${aiData.total_students || '?'}\n🤒 Kasal: ${aiData.sababli_kasal || 0}\n🚫 Sababsiz: ${aiData.sababsiz_jami || 0}\n👤 Mas'ul: ${aiData.fio || 'Aniqlanmadi'}\n\n<i>Hududingizni tanlash orqali davom eting.</i>`);

                    // Move to District selection but skip FIO if already found
                    await ctx.reply("📍 <b>Hududni tanlang:</b>", { parse_mode: "HTML", ...Markup.keyboard([...districtButtons, ["⬅️ Ortga", "🏠 Asosiy menyu"]]).resize() });
                    return ctx.wizard.selectStep(5);
                } else {
                    await ctx.reply("❌ Rasm tahlilida xatolik. Iltimos, ma'lumotlarni qo'lda kiriting yoki boshqa rasm yuboring.");
                }
            } catch (err) {
                console.error(err);
                await ctx.reply("❌ Tizimda xatolik yuz berdi.");
            }
            return;
        }

        if (ctx.message.text && ctx.message.text.startsWith('/')) {
            try { await ctx.scene.leave(); } catch (e) { }
            return next();
        }

        if (ctx.message.contact) {
            ctx.wizard.state.data.phone = ctx.message.contact.phone_number;
        } else {
            // Force contact sharing if not superadmin and not opting out
            const uid = ctx.from.id;
            const isSuperAdmin = [65002404, 786314811].includes(uid);
            if (!isSuperAdmin) {
                return ctx.reply("❌ <b>Xato!</b> Davomat kiritish uchun telefon raqamingizni pastdagi tugmani bosish orqali yuborishingiz shart.", { parse_mode: "HTML" });
            }
            ctx.wizard.state.data.phone = ctx.message.text;
        }

        await ctx.reply("👤 <b>Ma’lumot kirituvchining F.I.SH (MMIBDO‘) ni kiriting:</b>\n<i>(Masalan: Turdiyev Rustam Raushanovich)</i>", { parse_mode: "HTML", ...navButtons() });
        return ctx.wizard.next();
    },

    // 4. DISTRICT
    async (ctx) => {
        if (checkNav(ctx)) return;
        ctx.wizard.state.data.fio = ctx.message.text;
        await ctx.reply("📍 <b>Hududni tanlang:</b>", { parse_mode: "HTML", ...Markup.keyboard([...districtButtons, ["⬅️ Ortga", "🏠 Asosiy menyu"]]).resize() });
        return ctx.wizard.next();
    },

    // 5. SCHOOL
    async (ctx) => {
        if (checkNav(ctx)) return;
        const dist = ctx.message.text;
        const normDist = normalizeKey(dist);
        const allDistricts = Object.keys(TOPICS);
        const validDist = allDistricts.find(d => normalizeKey(d) === normDist);

        if (!validDist) return ctx.reply("⚠️ Tanlang:");

        ctx.wizard.state.data.district = validDist;
        await ctx.reply("⏳ <b>Maktablar yuklanmoqda...</b>", Markup.removeKeyboard());
        const schools = await getSchools(dist);
        ctx.wizard.state.schools = schools || []; // Save for validation

        if (!schools || schools.length === 0) {
            await ctx.reply("⚠️ Maktablar ro'yxati bo'sh. Maktab nomini kiriting:", navButtons());
        } else {
            const btns = [];
            for (let i = 0; i < schools.length; i += 3) btns.push(schools.slice(i, i + 3));
            await ctx.reply(`🏢 <b>${dist} maktabni quyiadagi tugmalar orqali tanlang:</b>\n<i>(Iltimos, qo'lda yozmang!)</i>`, { parse_mode: "HTML", ...Markup.keyboard([...btns, ["⬅️ Ortga", "🏠 Asosiy menyu"]]).resize() });
        }
        return ctx.wizard.next();
    },

    // 6. CLASSES COUNT (With Duplicate Check)
    async (ctx) => {
        if (checkNav(ctx)) return;

        // A) Handle Overwrite Confirmation Response
        if (ctx.wizard.state.awaiting_overwrite_confirm) {
            if (ctx.message.text === "HA (Yangilash)") {
                ctx.wizard.state.data.overwrite = true;
                ctx.wizard.state.awaiting_overwrite_confirm = false;
                // Proceed to ask classes count
                await ctx.reply("🏫 <b>Jami 1-11 sinf sinflar sonini kiriting (1-2 smena jami):</b>", { parse_mode: "HTML", ...navButtons() });
                return ctx.wizard.next();
            } else {
                await ctx.reply("🚫 Bekor qilindi.", Markup.keyboard([["Davomat kiritish"]]).resize());
                return ctx.scene.leave();
            }
        }

        const schoolInput = ctx.message.text;
        const schools = ctx.wizard.state.schools || [];

        // B) Validate School Selection
        if (schools.length > 0) {
            const match = schools.find(s => normalizeKey(s) === normalizeKey(schoolInput));
            if (!match) {
                return ctx.reply("❌ <b>Xato!</b> Iltimos, maktabni tugmalar orqali tanlang. Qo'lda kiritish taqiqlanadi.", { parse_mode: "HTML" });
            }
            ctx.wizard.state.data.school = match;
        } else {
            ctx.wizard.state.data.school = schoolInput;
        }

        // C) Check for Duplicates
        const { district, school } = ctx.wizard.state.data;
        const { checkIfExists } = require('../services/dataService'); // Lazy require to avoid circular dep issues if any
        const now = getFargonaTime();
        const today = now.toISOString().split('T')[0];

        // If 'overwrite' is already true (e.g. from forced arg), skip check? 
        // No, force_role is 'pro', not overwrite.

        try {
            const exists = await checkIfExists(district, school, today);
            if (exists) {
                ctx.wizard.state.awaiting_overwrite_confirm = true;
                await ctx.reply(`⚠️ <b>DIQQAT!</b>\n\n🏫 <b>${school}</b> bo'yicha bugun (${today}) uchun ma'lumot allaqachon kiritilgan.\n\nEski ma'lumotni o'chirib, yangisini kiritishni xohlaysizmi?`,
                    Markup.keyboard([["HA (Yangilash)", "YO'Q (Bekor qilish)"], ["🏠 Asosiy menyu"]]).resize()
                );
                return; // Stay in this step to wait for HA/YO'Q
            }
        } catch (e) {
            console.error("Duplicate check error:", e);
        }

        await ctx.reply("🏫 <b>Jami 1-11 sinf sinflar sonini kiriting (1-2 smena jami):</b>", { parse_mode: "HTML", ...navButtons() });
        return ctx.wizard.next();
    },

    // 7. TOTAL STUDENTS
    async (ctx) => {
        if (checkNav(ctx)) return;
        const v = parseInt(ctx.message.text);
        if (isNaN(v)) return ctx.reply("Raqam kiriting!");
        ctx.wizard.state.data.classes_count = v;
        await ctx.reply("👥 <b>Jami 1-11 sinf o‘quvchilar sonini kiriting (1-2 smena jami):</b>", { parse_mode: "HTML", ...navButtons() });
        return ctx.wizard.next();
    },

    // 8. SABABLI KASAL
    async (ctx) => {
        if (checkNav(ctx)) return;
        const v = parseInt(ctx.message.text);
        if (isNaN(v)) return ctx.reply("Raqam kiriting!");
        ctx.wizard.state.data.total_students = v;
        await ctx.reply("🤒 <b>Sababli Kasalligi tufayli kelmaganlar sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() });
        return ctx.wizard.next();
    },

    // 9-12 SABABLI OTHER
    async (ctx) => { if (checkNav(ctx)) return; ctx.wizard.state.data.sababli_kasal = parseInt(ctx.message.text) || 0; await ctx.reply("🏆 <b>Sababli Tadbirlar (tanlov musobaqalarda) tufayli kelmaganlar sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() }); return ctx.wizard.next(); },
    async (ctx) => { if (checkNav(ctx)) return; ctx.wizard.state.data.sababli_tadbirlar = parseInt(ctx.message.text) || 0; await ctx.reply("💍 <b>Sababli Oilaviy marosim (to'y, ma'raka va boshqa) tufayli kelmaganlar sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() }); return ctx.wizard.next(); },
    async (ctx) => { if (checkNav(ctx)) return; ctx.wizard.state.data.sababli_oilaviy = parseInt(ctx.message.text) || 0; await ctx.reply("👕 <b>Sababli Ijtimoiy ahvoli (kiyim, ust-bosh) tufayli kelmaganlar sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() }); return ctx.wizard.next(); },
    async (ctx) => { if (checkNav(ctx)) return; ctx.wizard.state.data.sababli_ijtimoiy = parseInt(ctx.message.text) || 0; await ctx.reply("❓ <b>Sababli Boshqa (sababli) tufayli kelmaganlar sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() }); return ctx.wizard.next(); },

    // 13. SABABSIZ START
    async (ctx) => {
        if (checkNav(ctx)) return;
        const d = ctx.wizard.state.data;
        d.sababli_boshqa = parseInt(ctx.message.text) || 0;
        d.sababli_jami = d.sababli_kasal + d.sababli_tadbirlar + d.sababli_oilaviy + d.sababli_ijtimoiy + d.sababli_boshqa;
        await ctx.reply("🏃 <b>Sababsiz Surunkali (muntazam) dars qoldiruvchi kelmaganlar sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() });
        return ctx.wizard.next();
    },

    // 14-22 SABABSIZ DETAILED
    async (ctx) => { if (checkNav(ctx)) return; ctx.wizard.state.data.sababsiz_muntazam = parseInt(ctx.message.text) || 0; await ctx.reply("🔍 <b>Sababsiz Qidiruvdagi oila farzandi sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() }); return ctx.wizard.next(); },
    async (ctx) => { if (checkNav(ctx)) return; ctx.wizard.state.data.sababsiz_qidiruv = parseInt(ctx.message.text) || 0; await ctx.reply("✈️ <b>Sababsiz Chet elga ruxsatsiz chiqib ketganlar sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() }); return ctx.wizard.next(); },
    async (ctx) => { if (checkNav(ctx)) return; ctx.wizard.state.data.sababsiz_chetel = parseInt(ctx.message.text) || 0; await ctx.reply("🚭 <b>Sababsiz O'qishdan bo'yin tovlagan yurganlar sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() }); return ctx.wizard.next(); },
    async (ctx) => { if (checkNav(ctx)) return; ctx.wizard.state.data.sababsiz_boyin = parseInt(ctx.message.text) || 0; await ctx.reply("🔨 <b>Sababsiz Dars vaqtida ishlab yurganlar sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() }); return ctx.wizard.next(); },
    async (ctx) => { if (checkNav(ctx)) return; ctx.wizard.state.data.sababsiz_ishlab = parseInt(ctx.message.text) || 0; await ctx.reply("🛑 <b>Sababsiz Ota-ona farzandi o'qishiga qarshiligi sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() }); return ctx.wizard.next(); },
    async (ctx) => { if (checkNav(ctx)) return; ctx.wizard.state.data.sababsiz_qarshilik = parseInt(ctx.message.text) || 0; await ctx.reply("👮‍♂️ <b>Sababsiz Jazo/Tergovdaligi sabablilar sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() }); return ctx.wizard.next(); },
    async (ctx) => { if (checkNav(ctx)) return; ctx.wizard.state.data.sababsiz_jazo = parseInt(ctx.message.text) || 0; await ctx.reply("🚶 <b>Sababsiz Ota-ona nazoratsiz yurganlar sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() }); return ctx.wizard.next(); },
    async (ctx) => { if (checkNav(ctx)) return; ctx.wizard.state.data.sababsiz_nazoratsiz = parseInt(ctx.message.text) || 0; await ctx.reply("❓ <b>Sababsiz (boshqa) lar sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() }); return ctx.wizard.next(); },
    async (ctx) => { if (checkNav(ctx)) return; ctx.wizard.state.data.sababsiz_boshqa = parseInt(ctx.message.text) || 0; await ctx.reply("💍 <b>Turmushga chiqqanlar sonini kiriting:</b>", { parse_mode: "HTML", ...navButtons() }); return ctx.wizard.next(); },

    // 23. CALCULATION
    async (ctx) => {
        if (checkNav(ctx)) return;
        const d = ctx.wizard.state.data;
        d.sababsiz_turmush = parseInt(ctx.message.text) || 0;
        d.sababsiz_jami = d.sababsiz_muntazam + d.sababsiz_qidiruv + d.sababsiz_chetel + d.sababsiz_boyin + d.sababsiz_ishlab + d.sababsiz_qarshilik + d.sababsiz_jazo + d.sababsiz_nazoratsiz + d.sababsiz_boshqa + d.sababsiz_turmush;
        d.total_absent = d.sababli_jami + d.sababsiz_jami;

        // Validation: Sum check
        if (d.total_absent > d.total_students) {
            await ctx.reply(`⚠️ <b>Xato!</b> Jami kelmaganlar (${d.total_absent}) o'quvchilar sonidan (${d.total_students}) ko'p bo'lishi mumkin emas.\n\nIltimos, ma'lumotlarni qaytadan tekshirib kiriting.`, { parse_mode: 'HTML' });
            return ctx.wizard.selectStep(7); // Go back to total students
        }

        d.students_list = [];

        if (d.sababsiz_jami > 0) {
            await ctx.reply(`🔴 <b>Sizda sababsiz kelmagan o‘quvchilar soni ${d.sababsiz_jami} nafarni tashkil etadi iltimos ushbu o‘quvchilar haqidagi ma’lumotni keyingi bosqichda to‘ldiring.</b>`, { parse_mode: "HTML" });
            await ctx.reply(`🏫 <b>Sababsiz kelmagan 1-o'quvchining sinfini kiriting (8, 8A yoki 11, 11-A):</b>`, { parse_mode: "HTML", ...navButtons() });
            return ctx.wizard.next();
        } else {
            return ctx.wizard.selectStep(30); // Skip student list, go to Inspector
        }
    },

    // 24. CLASS
    async (ctx) => {
        if (checkNav(ctx)) return;
        ctx.wizard.state.current = { class: ctx.message.text };
        await ctx.reply("👤 <b>O‘quvchining F.I.SH yozing:</b>\n<i>(Masalan: Eshmatov Toshmat G'anisher o'g'li)</i>", { parse_mode: "HTML", ...navButtons() });
        return ctx.wizard.next();
    },
    // 25. NAME
    async (ctx) => {
        if (checkNav(ctx)) return;
        ctx.wizard.state.current.name = ctx.message.text;
        await ctx.reply("🏠 <b>O‘quvchining yashash manzilini yozing:</b>\n<i>(Masalan: Oltiariq tuman, Tinchlik MFY, Mustaqillik ko'chasi, 24-uy)</i>", { parse_mode: "HTML", ...navButtons() });
        return ctx.wizard.next();
    },
    // 26. ADDRESS
    async (ctx) => {
        if (checkNav(ctx)) return;
        ctx.wizard.state.current.address = ctx.message.text;
        await ctx.reply("👨‍👩‍👦 <b>O‘quvchining ota yoki onasini F.I.SH yozing:</b>\n<i>(Masalan: Eshmatov G'anisher)</i>", { parse_mode: "HTML", ...navButtons() });
        return ctx.wizard.next();
    },
    // 27. PARENT PHONE
    async (ctx) => {
        if (checkNav(ctx)) return;
        ctx.wizard.state.current.parent_name = ctx.message.text;
        await ctx.reply("📞 <b>Ota-onasining telefon raqamini yozing:</b>\n\n⚠️ <b>Namuna:</b> +998901234567\n<i>(Faqat raqamlar, probel yoki chiziqchasiz yozing)</i>", { parse_mode: "HTML", ...navButtons() });
        return ctx.wizard.next();
    },
    // 28. LOOP
    async (ctx) => {
        if (checkNav(ctx)) return;
        const phone = ctx.message.text ? ctx.message.text.trim() : "-";
        const cleanPhone = phone.replace(/[^0-9]/g, '');

        // Qat'iy tekshiruv: Kamida 9 ta raqam bo'lishi kerak
        if (cleanPhone.length < 9) {
            await ctx.reply("❌ <b>Xato! Telefon raqami noto'g'ri.</b>\n\nIltimos, namuna bo'yicha qaytadan kiriting:\n<b>Namuna:</b> +998901234567", { parse_mode: "HTML" });
            return; // Stay in this step
        }

        ctx.wizard.state.current.parent_phone = phone;
        if (!d.students_list) d.students_list = [];
        d.students_list.push(ctx.wizard.state.current);

        if (d.students_list.length < d.sababsiz_jami) {
            await ctx.reply(`✅ <b>${d.students_list.length}-o'quvchi saqlandi.</b>\n\n🏫 <b>Agarda sababsiz kelmagan o‘quvchilar soni 1 tadan ortiq bo'lsa, ${d.students_list.length + 1}-o'quvchining sinfini kiriting (8, 8A yoki 11, 11-A):</b>`, { parse_mode: "HTML", ...navButtons() });
            return ctx.wizard.selectStep(24);
        } else {
            await ctx.reply("✅ <b>Barcha sababsiz o'quvchilar kiritildi.</b>\n\n🕵️‍♂️ <b>Iltimos, maktabga biriktirilgan inspektor-psixologning F.I.SH. va unvonini kiriting:</b>\n<i>(Masalan: leytenant Eshmatov Toshmat)</i>", { parse_mode: "HTML", ...navButtons() });
            return ctx.wizard.next();
        }
    },

    // 29. INSPEKTOR
    async (ctx) => {
        if (checkNav(ctx)) return;
        const inspector = ctx.message.text ? ctx.message.text.trim() : "";
        if (inspector.length < 3) {
            return ctx.reply("❌ <b>Xato!</b> Inspektor-psixologning F.I.SH. kiritish majburiy. Iltimos, to'liq yozing:", { parse_mode: "HTML" });
        }
        ctx.wizard.state.data.inspector = inspector;

        const uid = ctx.from.id;
        const isPro = ctx.wizard.state.forced_role === 'pro' || db.checkPro(uid);
        const d = ctx.wizard.state.data;

        // PRO foydalanuvchilar uchun bildirishnomani bot o'zi yaratadi (3-ILOVA), shuning uchun yuklash shart emas
        if (isPro && d.sababsiz_jami > 0 && d.students_list && d.students_list.length > 0) {
            await ctx.reply("✨ <b>Siz PRO foydalanuvchisiz!</b>\nBildirishnoma (3-ILOVA) kiritilgan o'quvchilar ma'lumotlari asosida avtomatik tayyorlanadi.", { parse_mode: 'HTML' });

            // Skip report upload (Step 30 logic move here)
            d.report_type = 'auto_generated';

            await ctx.replyWithHTML(
                `📌 <b>TASDIQLASH:</b>\n\n🏢 <b>${d.district}, ${d.school}</b>\n👤 <b>${d.fio}</b>\n\n🎒 Sinflar: ${d.classes_count}\n👥 Jami o'quvchilar: ${d.total_students}\n✅ Sababli kelmaganlar: ${d.sababli_jami}\n🚫 Sababsiz: ${d.sababsiz_jami} (Ro'yxat kiritildi)\n📉 Jami kelmaganlar: ${d.total_absent}\n\nMa'lumotlar to'g'rimi?`,
                Markup.keyboard([["HA", "YO'Q"], ["⬅️ Ortga"]]).resize()
            );
            return ctx.wizard.selectStep(31);
        }

        const now = getFargonaTime();
        const today = now.toLocaleDateString("ru-RU");
        await ctx.replyWithHTML(`📄 <b>Sababsiz kelmagan o‘quvchilar to‘g‘risidagi bildirgini kiriting (Bugungi sana: ${today}).</b>\n<i>(Rasm, PDF yoki matn shaklida yuborishingiz mumkin)</i>`, navButtons());
        return ctx.wizard.next();
    },

    // 30. RECEIVE REPORT FILE/TEXT
    async (ctx) => {
        if (checkNav(ctx)) return;

        const d = ctx.wizard.state.data;
        const isAbsentWithoutReason = d.sababsiz_jami > 0;

        // Agar rasm/pdf yuborsa yuklab olamiz
        if (ctx.message.document || ctx.message.photo) {
            const fileId = ctx.message.document ? ctx.message.document.file_id : ctx.message.photo[ctx.message.photo.length - 1].file_id;
            try {
                const fileLink = await ctx.telegram.getFileLink(fileId);
                const ext = path.extname(fileLink.href) || '.jpg';
                const fileName = `BILDIRGI_TG_${d.district}_${d.school}_${Date.now()}${ext}`.replace(/[^a-zA-Z0-9_.]/g, '_');
                const uploadDir = path.join(__dirname, '../../assets/uploads');
                const filePath = path.join(uploadDir, fileName);

                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

                const response = await axios({ url: fileLink.href, method: 'GET', responseType: 'stream' });
                const writer = fs.createWriteStream(filePath);
                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                d.bildirgi = filePath;
                d.report_type = 'file';
            } catch (e) {
                console.error("File download error:", e);
                return ctx.reply("❌ Faylni yuklashda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
            }
        } else if (ctx.message.text && ctx.message.text.length > 10) {
            d.report_text = ctx.message.text;
            d.report_type = 'text';
        } else if (isAbsentWithoutReason) {
            return ctx.reply("⚠️ Sababsiz kelmagan o'quvchilar borligi sababli, Bildirgi yuborish MAJBURIY. Iltimos, rasm yoki tushuntirish matnini yuboring:");
        }

        await ctx.replyWithHTML(
            `📌 <b>TASDIQLASH:</b>\n\n🏢 <b>${d.district}, ${d.school}</b>\n👤 <b>${d.fio}</b>\n\n🎒 Sinflar: ${d.classes_count}\n👥 Jami o'quvchilar: ${d.total_students}\n✅ Sababli kelmaganlar: ${d.sababli_jami}\n🚫 Sababsiz: ${d.sababsiz_jami}\n📉 Jami kelmaganlar: ${d.total_absent}\n\nMa'lumotlar to'g'rimi?`,
            Markup.keyboard([["HA", "YO'Q"], ["⬅️ Ortga"]]).resize()
        );
        return ctx.wizard.next();
    },

    // 31. FINAL SEND
    async (ctx) => {
        if (ctx.message.text === "⬅️ Ortga") return ctx.wizard.back();
        if (ctx.message.text !== "HA") { await ctx.reply("🚫 Bekor qilindi.", Markup.keyboard([["Davomat kiritish"]]).resize()); return ctx.scene.leave(); }

        const uid = ctx.from.id;
        await ctx.reply("📤 Yuborilmoqda... ⏳", Markup.removeKeyboard());
        try {
            const d = ctx.wizard.state.data;
            d.user_id = uid;
            d.source = 'bot';

            // Auto-generate PDF for PRO
            if (d.report_type === 'auto_generated') {
                try {
                    const pdfPath = await generateBildirgi(d);
                    d.bildirgi = pdfPath;
                    await ctx.replyWithDocument({ source: pdfPath, filename: path.basename(pdfPath) }, { caption: "✅ PRO: Avtomatik shakllantirilgan bildirgi." });
                } catch (e) {
                    console.error("Auto PDF Error:", e);
                }
            }

            const success = await saveData(d);

            if (success) {
                // Real-time Notification to Parents
                if (d.students_list && d.students_list.length > 0) {
                    notifyParents(d, d.students_list).catch(e => console.error("Notification trigger error:", e));
                }
                // Save Profile for next time
                db.saveUser(ctx, { district: d.district, school: d.school, fio: d.fio, phone: d.phone });

                const isProFinal = ctx.wizard.state.forced_role === 'pro' || db.checkPro(uid);
                const report = formatAttendanceReport(d, isProFinal, 'bot');

                // Send to Report Group (Main Text)
                const tid = getTopicId(d.district);
                if (tid) {
                    await ctx.telegram.sendMessage(REPORT_GROUP_ID, report, { parse_mode: 'HTML', message_thread_id: tid });
                }

                // Agar foydalanuvchi o'zi rasm/pdf yuklagan bo'lsa, uni ham guruhga tashlaymiz
                if (d.report_file_id && tid) {
                    if (d.report_type === 'document') {
                        await ctx.telegram.sendDocument(REPORT_GROUP_ID, d.report_file_id, { caption: "📄 Yuklangan bildirgi", message_thread_id: tid });
                    } else if (d.report_type === 'photo') {
                        await ctx.telegram.sendPhoto(REPORT_GROUP_ID, d.report_file_id, { caption: "📸 Yuklangan bildirgi", message_thread_id: tid });
                    }
                }

                // Generate PDF (Annex 3) for PRO users
                if (isProFinal && d.sababsiz_jami > 0 && d.students_list.length > 0) {
                    await ctx.reply("📄 <b>Professional Bildirishnoma (PDF) tayyorlanmoqda...</b>", { parse_mode: 'HTML' });
                    try {
                        const pdfPath = await generateBildirishnoma({
                            district: d.district,
                            school: d.school,
                            inspector: d.inspector,
                            fio: d.fio,
                            students: d.students_list
                        });

                        const doc = { source: pdfPath, filename: `3-ILOVA_${d.school}.pdf` };
                        const caption = `✅ <b>3-ILOVA (Bildirishnoma) tayyor!</b>\n\nUshbu hujjatni inspektor-psixologga taqdim etishingiz mumkin.`;

                        await ctx.replyWithDocument(doc, { caption, parse_mode: 'HTML' });

                        if (tid) {
                            await ctx.telegram.sendDocument(REPORT_GROUP_ID, doc, {
                                caption: `#Bildirishnoma #3_ILOVA\n📍 ${d.district}, ${d.school}\n👤 Mas'ul: ${d.fio}`,
                                message_thread_id: tid
                            });
                        }

                        // Clean up temp file
                        // setTimeout(() => { if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath); }, 60000);

                    } catch (e) {
                        console.error("Local PDF Error", e);
                        await ctx.reply("❌ PDF tayyorlashda xatolik yuz berdi.");
                    }
                } else if (d.sababsiz_jami > 0 && d.students_list.length > 0) {
                    // Non-pro users or cloud version
                    await ctx.reply("📄 Bildirishnoma tayyorlanmoqda (Cloud)...");
                    try {
                        const now = getFargonaTime();
                        const pdfDate = now.toLocaleDateString('ru-RU');
                        const pdfRes = await generatePdf({
                            district: d.district, school: d.school, inspector: d.inspector,
                            date: pdfDate, students: d.students_list
                        });

                        if (pdfRes && pdfRes.data && pdfRes.data.url) {
                            const pdfUrl = pdfRes.data.url;
                            await ctx.replyWithDocument({ url: pdfUrl, filename: 'Bildirishnoma.pdf' });
                        }
                    } catch (e) { console.error("Cloud PDF Error", e); }
                }

                await ctx.reply("✅ <b>Muvaffaqiyatli saqlandi!</b>", Markup.keyboard([["Davomat kiritish"]]).resize());
            } else {
                await ctx.reply("❌ Xatolik. Qayta urinib ko'ring.");
            }
        } catch (e) {
            console.error(e);
            await ctx.reply("❌ Tizim xatosi.");
        }
        return ctx.scene.leave();
    }
);

module.exports = attendanceWizard;

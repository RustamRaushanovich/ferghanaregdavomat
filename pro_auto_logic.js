const fs = require('fs');
const path = 'C:\\\\Users\\\\Manaviyat2\\\\.gemini\\\\antigravity\\\\scratch\\\\31.03.2024\\\\index.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Update bot.start to handle 'pro' payload
const oldStart = `bot.start(async (ctx) => {
    console.log(\`[START] User: \${ctx.from.id}\`);`;
const newStartHead = `bot.start(async (ctx) => {
    console.log(\`[START] User: \${ctx.from.id}\`);
    if (ctx.startPayload === 'pro') {
        ctx.session.waiting_receipt = true;
        return ctx.replyWithHTML("👑 <b>PRO Obunani tasdiqlash</b>\\n\\nIltimos, тўлов чекини (скриншот ёки расм) юборинг. \\nАдминларимиз тезда текшириб, PRO статусни фаоллаштириб беришади.");
    }
`;
content = content.replace(oldStart, newStartHead);

// 2. Add receipt listener and action handlers
// Before bot.on('location')
const locationMarker = "bot.on('location'";
const proHandlers = `
// PRO: Receipt Handler
bot.on(['photo', 'document'], async (ctx) => {
    if (ctx.session && ctx.session.waiting_receipt) {
        const uid = ctx.from.id;
        const name = ctx.from.first_name || 'Foydalanuvchi';
        const userName = ctx.from.username ? '@' + ctx.from.username : 'NoUsername';
        
        // Forward to All Super Admins
        const admins = config.SUPER_ADMIN_IDS;
        
        for (const adminId of admins) {
            try {
                const forwardMsg = \`🧾 <b>Yangi to'lov cheki!</b>\\n\\nKimdan: \${name} (\${userName})\\nUID: <code>\${uid}</code>\\n\\nPRO статусни фаоллаштириш учун тугмани босинг:\`;
                
                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.callback('✅ 1 ойлик (Faollashtirish)', \`approve_pro:\${uid}:1\`)],
                    [Markup.button.callback('✅ 3 ойлик (Faollashtirish)', \`approve_pro:\${uid}:3\`)],
                    [Markup.button.callback('❌ Rad etish', \`reject_pro:\${uid}\`)]
                ]);

                if (ctx.message.photo) {
                    await ctx.telegram.sendPhoto(adminId, ctx.message.photo[ctx.message.photo.length - 1].file_id, { caption: forwardMsg, parse_mode: 'HTML', ...keyboard });
                } else if (ctx.message.document) {
                    await ctx.telegram.sendDocument(adminId, ctx.message.document.file_id, { caption: forwardMsg, parse_mode: 'HTML', ...keyboard });
                }
            } catch (e) { console.error("Admin Forward Error:", e.message); }
        }

        ctx.session.waiting_receipt = false;
        return ctx.reply("✅ Чекингиз админларга юборилди. Тез орада тасдиқланади!");
    }
    // If not waiting receipt, maybe other handlers handle it?
});

// PRO: Inline Buttons Actions
bot.action(/approve_pro:(\\d+):(\\d+)/, async (ctx) => {
    const [, targetUid, months] = ctx.match;
    if (!config.SUPER_ADMIN_IDS.includes(ctx.from.id)) return ctx.answerCbQuery("Ruxsat yo'q.");

    try {
        const result = db.updateUserProMonths(targetUid, parseInt(months));
        await ctx.answerCbQuery("PRO faollashtirildi!");
        await ctx.editMessageCaption(ctx.update.callback_query.message.caption + "\\n\\n✅ <b>FAOLLASHTIRILDI (\${months} oy)</b>", { parse_mode: 'HTML' });
        
        // Notify User
        await ctx.telegram.sendMessage(targetUid, \`🎉 <b>Tabriklaymiz!</b>\\n\\nТўловингиз тасдиқланди ва <b>PRO</b> обунангиз \${months} ойга фаоллаштирилди!\`, { parse_mode: 'HTML' });
    } catch (e) {
        ctx.answerCbQuery("Xatolik: " + e.message);
    }
});

bot.action(/reject_pro:(\\d+)/, async (ctx) => {
    const targetUid = ctx.match[1];
    if (!config.SUPER_ADMIN_IDS.includes(ctx.from.id)) return ctx.answerCbQuery("Ruxsat yo'q.");
    
    await ctx.answerCbQuery("Rad etildi.");
    await ctx.editMessageCaption(ctx.update.callback_query.message.caption + "\\n\\n❌ <b>RAD ETILDI</b>", { parse_mode: 'HTML' });
    await ctx.telegram.sendMessage(targetUid, "❌ Узр, тўлов чекингиз тасдиқланмади. Хатолик бўлса @qirol га мурожаат қилинг.");
});\n\n`;

content = content.replace(locationMarker, proHandlers + locationMarker);

fs.writeFileSync(path, content);
console.log("PRO Semi-Auto confirmation logic added to index.js.");

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateMasterpieceV2() {
    const doc = new PDFDocument({
        layout: 'portrait',
        size: 'A4',
        margin: 0,
        compress: true,
        info: {
            Title: 'DAVOMAT TIZIMI - SHOHONA QOLLANMA',
            Author: 'IT Center MMTB'
        }
    });

    const outputPath = path.join(__dirname, '../DAVOMAT_MASTERPIECE_JURNAL_UZB.pdf');
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const PALETTE = {
        DEEP_NAVY: '#0B132B',
        MIDNIGHT: '#1C2541',
        EMERALD: '#004B23',
        GOLD: '#C5A059',
        LIGHT_GOLD: '#E9D5A3',
        SILVER: '#BDC3C7',
        WHITE: '#FFFFFF',
        ACCENT: '#3A506B',
        DANGER: '#E63946'
    };

    // Realistic patterns instead of smileys
    function drawGrid(opacity = 0.05) {
        doc.save().opacity(opacity).lineWidth(0.5).strokeColor(PALETTE.WHITE);
        for (let i = 0; i < 600; i += 20) {
            doc.moveTo(i, 0).lineTo(i, 842).stroke();
            doc.moveTo(0, i).lineTo(595, i).stroke();
        }
        doc.restore();
    }

    function drawUzbekBorder(color = PALETTE.GOLD, opacity = 0.5) {
        doc.save().opacity(opacity).lineWidth(2).strokeColor(color);
        // Top
        doc.rect(20, 20, 555, 802).stroke();
        // Corner shapes
        const size = 30;
        const corners = [[20, 20], [575, 20], [20, 822], [575, 822]];
        corners.forEach(([x, y]) => {
            doc.moveTo(x - 10, y).lineTo(x + 10, y).stroke();
            doc.moveTo(x, y - 10).lineTo(x, y + 10).stroke();
            doc.circle(x, y, 5).stroke();
        });
        doc.restore();
    }

    function drawTechVisual(x, y, w, h) {
        doc.save().translate(x, y);
        doc.rect(0, 0, w, h).fillColor(PALETTE.MIDNIGHT).opacity(0.8).fill();
        doc.rect(0, 0, w, 20).fillColor(PALETTE.GOLD).fill();
        // Bars
        for (let i = 0; i < 5; i++) {
            let bh = 20 + Math.random() * 50;
            doc.rect(20 + i * 30, h - bh - 10, 20, bh).fillColor(PALETTE.LIGHT_GOLD).fill();
        }
        // Dots
        for (let i = 0; i < 10; i++) {
            doc.circle(w - 30, 40 + i * 15, 3).fillColor(PALETTE.GOLD).fill();
        }
        doc.restore();
    }

    function applyPremiumBg(type = 'NAVY') {
        let grad = doc.linearGradient(0, 0, 595, 842);
        if (type === 'NAVY') {
            grad.stop(0, PALETTE.DEEP_NAVY).stop(0.5, PALETTE.MIDNIGHT).stop(1, PALETTE.DEEP_NAVY);
        } else {
            grad.stop(0, PALETTE.EMERALD).stop(0.5, '#003318').stop(1, PALETTE.EMERALD);
        }
        doc.rect(0, 0, 595.28, 841.89).fill(grad);
        drawGrid(0.03);
        drawUzbekBorder();
    }

    function drawTitlePage(title, subtitle) {
        doc.save();
        doc.fillColor(PALETTE.GOLD).fontSize(28).font('Helvetica-Bold').text(title, 50, 50, { width: 495, align: 'left' });
        doc.rect(50, 90, 100, 3).fill(PALETTE.GOLD);
        doc.restore();
    }

    // --- PAGE 1: COVER ---
    applyPremiumBg('NAVY');
    // Large Abstract Eye-catching Visual
    doc.save()
        .translate(297, 421)
        .rotate(45)
        .rect(-150, -150, 300, 300).lineWidth(1).strokeColor(PALETTE.GOLD)
        .rotate(-45)
        .restore();

    doc.fillColor(PALETTE.GOLD).fontSize(42).font('Helvetica-Bold').text("DAVOMAT MASTER", 0, 280, { align: 'center', characterSpacing: 5 });
    doc.fillColor(PALETTE.WHITE).fontSize(14).font('Helvetica').text("RAQAMLI NAZORAT VA ANALITIKA TIZIMI", 0, 335, { align: 'center', characterSpacing: 2 });

    doc.rect(0, 500, 595, 120).fillColor(PALETTE.GOLD).opacity(0.1).fill();
    doc.fillColor(PALETTE.WHITE).fontSize(18).opacity(1).text("FARG'ONA VILOYATI MMTB", 50, 540, { align: 'center' });

    doc.fontSize(26).fillColor(PALETTE.GOLD).text("O'QUV JURNALI", 50, 700, { align: 'center' });
    doc.fontSize(10).fillColor(PALETTE.LIGHT_GOLD).text("PREMIUM EDITION 2026", 50, 735, { align: 'center' });

    // --- PAGE 2: STRICKT REQUIREMENTS ---
    doc.addPage();
    applyPremiumBg('EMERALD');
    drawTitlePage("MAJBURIY TALABLAR", "STRICKT RULES");

    doc.fillColor(PALETTE.WHITE).fontSize(16).text("DIQQAT! MUHIM OGOHLANTIRISH:", 60, 150);
    doc.rect(60, 175, 475, 200).fillColor(PALETTE.DANGER).opacity(0.1).fill();
    doc.opacity(1).fillColor(PALETTE.WHITE).fontSize(13).text(
        "Tizimda shaffoflik va aniqlikni ta'minlash maqsadida quyidagi qoida qat'iy o'rnatilgan:\n\n" +
        "🔴 AGAR MAKTABDA SABABSIZ KELMAGAN O'QUVCHILAR BO'LSA, BATAHSIL BILDIRISHNOMA (BILDIRGI) YUKLASH MAJBURIYDIR.\n\n" +
        "Ushbu hujjat yuklanmagan taqdirda, tizim davomat ma'lumotlarini QABUL QILMAYDI. Bu ham Web platformaga, ham Telegram botga tegishli.",
        80, 200, { width: 435, lineGap: 8 }
    );

    drawTechVisual(150, 450, 300, 200);

    // --- PAGE 3: WEB DASHBOARD ---
    doc.addPage();
    applyPremiumBg('NAVY');
    drawTitlePage("WEB MONITORING PLATFORMASI", "ONLINE ACCESS");

    doc.fillColor(PALETTE.GOLD).fontSize(20).text("YAGONA WEB MANZIL:", 60, 150);
    doc.rect(60, 180, 475, 60).fillColor(PALETTE.WHITE).opacity(0.05).fill();
    doc.fillColor(PALETTE.LIGHT_GOLD).fontSize(22).opacity(1).text("ferghanaregdavomat.onrender.com", 60, 200, { align: 'center', width: 475 });

    doc.fillColor(PALETTE.WHITE).fontSize(13).text(
        "Platformaga istalgan qurilmada (Kompyuter, Planshet, Telefon) brauzer orqali kirish mumkin. " +
        "Dashboard orqali mas'ullar real vaqt rejimida viloyat va tumanlar kesimidagi statistikani kuzatib boradilar.",
        60, 300, { width: 475, lineGap: 5 }
    );

    // Abstract chart
    doc.save()
        .moveTo(100, 600).lineTo(500, 600).strokeColor(PALETTE.GOLD).stroke()
        .moveTo(100, 600).lineTo(150, 520).lineTo(250, 550).lineTo(400, 400).lineTo(500, 450).stroke()
        .restore();

    // --- PAGE 4: TELEGRAM BOT ---
    doc.addPage();
    applyPremiumBg('NAVY');
    drawTitlePage("RASMIY TELEGRAM BOT", "BOT INTERFACE");

    doc.fillColor(PALETTE.GOLD).fontSize(18).text("@ferghanaregdavomat_bot", 60, 150);
    doc.fillColor(PALETTE.WHITE).fontSize(13).text(
        "Bot orqali davomat kiritish eng tezkor usul hisoblanadi. Botga birinchi marta kirganda /start buyrug'i " +
        "beriladi va telefon raqami tasdiqlanadi. Shundan so'ng MMIBDO' o'z maktabini tanlab, ma'lumotlarni kiritadi.",
        60, 200, { width: 475, lineGap: 6 }
    );

    // Modern Box
    doc.rect(60, 350, 475, 400).fillColor(PALETTE.GOLD).opacity(0.05).fill();
    doc.opacity(1).strokeColor(PALETTE.GOLD).rect(60, 350, 475, 400).stroke();
    doc.fillColor(PALETTE.GOLD).fontSize(14).text("Kiritish tartibi:", 80, 370);

    const steps = [
        "Telefon orqali shaxsni tasdiqlash",
        "Tuman va maktabni menyudan tanlash",
        "Jami sinf va o'quvchilar sonini kiritish",
        "Sababli va Sababsizlar tahlili",
        "Sababsizlar uchun F.I.SH va manzilni kiritish",
        "BILDIRGI yuklash (Majburiy)"
    ];
    let sy = 410;
    steps.forEach((s, i) => {
        doc.fillColor(PALETTE.WHITE).text(`${i + 1}. ${s}`, 90, sy);
        sy += 50;
    });

    // --- PAGE 5: HUDUD TANLASH ---
    doc.addPage();
    applyPremiumBg('EMERALD');
    drawTitlePage("HUDUD VA MAKTABLAR", "LOCATION SELECT");

    doc.fillColor(PALETTE.WHITE).fontSize(13).text(
        "Tizim Farg'ona viloyatidagi barcha 19 ta tuman va shaharlarni to'liq qamrab olgan. " +
        "Maktab mas'uli o'z hududini tanlaganda, tizim avtomatik ravishda ushbu hududdagi barcha maktablar ro'yxatini taqdim etadi.",
        60, 150, { width: 475 }
    );

    // Abstract Map dots
    for (let i = 0; i < 15; i++) {
        doc.circle(150 + Math.random() * 300, 350 + Math.random() * 300, 3).fill(PALETTE.GOLD);
    }
    doc.fontSize(10).fillColor(PALETTE.LIGHT_GOLD).text("VILOYAT HUUDLARI SHIFRLANGAN BAZADA", 200, 700);

    // --- PAGE 6: MA'LUMOTLAR TAHLILI ---
    doc.addPage();
    applyPremiumBg('NAVY');
    drawTitlePage("MA'LUMOT KIRITISH", "DATA ENTRY");

    doc.fillColor(PALETTE.WHITE).fontSize(13).text(
        "Ma'lumotlar kiritishda har bir sabab alohida so'raladi (Tadbirlar, Kasallik, Oilaviy). " +
        "Bu tahlil yakunda hisobotning aniqligini ta'minlaydi.",
        60, 150, { width: 475 }
    );

    drawTechVisual(100, 250, 400, 400);

    // --- PAGE 7: PRO IMKONIYATLAR ---
    doc.addPage();
    applyPremiumBg('NAVY');
    drawTitlePage("PRO IMKONIYATLAR", "PREMIUM FEATURES");

    doc.rect(60, 150, 475, 120).fillColor(PALETTE.GOLD).opacity(0.1).fill();
    doc.opacity(1).fillColor(PALETTE.GOLD).fontSize(16).text("✨ AVTOMATIK BILDIRISHNOMA (PDF)", 80, 180);
    doc.fillColor(PALETTE.WHITE).fontSize(12).text(
        "PRO foydalanuvchilar bildirgini qo'lda yuklashlari shart emas. Tizim kiritilgan o'quvchilar " +
        "ro'yxati asosida '3-ILOVA' shaklidagi rasmiy PDF bildirishnomani 1 soniyada tayyorlab beradi.",
        80, 210, { width: 435 }
    );

    // --- PAGE 8: OTA-ONALAR NAZORATI ---
    doc.addPage();
    applyPremiumBg('EMERALD');
    drawTitlePage("OTA-ONALAR NAZORATI", "PARENT CONTROL");

    doc.fillColor(PALETTE.GOLD).fontSize(18).text("@ferregdavomatparents_bot", 60, 150);
    doc.fillColor(PALETTE.WHITE).fontSize(13).text(
        "Farzandi sababsiz dars qoldirganda, ota-onalarga bot yoki SMS orqali TEZKOR XABAR yuboriladi. " +
        "Bu maktab va oila o'rtasidagi aloqani mustahkamlaydi.",
        60, 200, { width: 475 }
    );

    // --- PAGE 9: XAVFSIZLIK ---
    doc.addPage();
    applyPremiumBg('NAVY');
    drawTitlePage("XAVFSIZLIK VA SHIFRLASH", "SECURITY");

    doc.rect(197, 300, 200, 250).strokeColor(PALETTE.GOLD).lineWidth(1).stroke();
    doc.fillColor(PALETTE.GOLD).fontSize(14).text("SSL + PGP ENCRYPTION", 197, 570, { align: 'center', width: 200 });

    doc.fillColor(PALETTE.WHITE).fontSize(13).text(
        "Barcha ma'lumotlar Supabase/PostgreSQL bazasida eng yuqori darajada himoyalangan. " +
        "Serverlarimiz 24/7 nazorat ostida.",
        60, 150, { width: 475 }
    );

    // --- PAGE 10: XALQARO TARTIB ---
    doc.addPage();
    applyPremiumBg('NAVY');
    drawTitlePage("RAQAMLI TA'LIM", "INTERNATIONAL STANDARDS");
    doc.fillColor(PALETTE.WHITE).text("Tizim xalqaro ta'lim standartlari asosida ishlab chiqilgan bo'lib, har bir o'quvchi uchun raqamli pasport rolini o'ynaydi.", 60, 150, { width: 475 });

    // --- PAGE 11: JARAYON CHIZMASI ---
    doc.addPage();
    applyPremiumBg('EMERALD');
    drawTitlePage("LOGISTIKA VA JARAYON", "FLOWCHART");

    let fy = 150;
    ["G'oya", "Rivojlantirish", "Test sinovlari", "MMTB tasdiqi", "Ommalashtirish"].forEach(t => {
        doc.rect(150, fy, 295, 40).fill(PALETTE.GOLD);
        doc.fillColor(PALETTE.MIDNIGHT).text(t, 150, fy + 15, { align: 'center', width: 295 });
        fy += 70;
    });

    // --- PAGE 12: TEXNIK QO'LLAB-QUVVATLASH ---
    doc.addPage();
    applyPremiumBg('NAVY');
    drawTitlePage("BOG'LANISH", "CONTACT US");
    doc.fillColor(PALETTE.WHITE).fontSize(15).text("Muammolar yuzaga kelganda:", 60, 150);
    doc.fillColor(PALETTE.GOLD).fontSize(18).text("\nTelegram: @uzdev_admin\nCall Center: +998 90 588 47 00", 60, 200);

    // --- PAGE 13: QR MANZILLAR ---
    doc.addPage();
    applyPremiumBg('NAVY');
    drawTitlePage("TEZKOR KIRISH", "QR ACCESS");
    doc.rect(100, 200, 150, 150).stroke(PALETTE.GOLD);
    doc.rect(345, 200, 150, 150).stroke(PALETTE.GOLD);
    doc.fillColor(PALETTE.WHITE).fontSize(11).text("WEB SITE QR", 100, 360, { width: 150, align: 'center' });
    doc.text("BOT QR", 345, 360, { width: 150, align: 'center' });

    // --- PAGE 14: ORQA MUQOVA ---
    doc.addPage();
    applyPremiumBg('NAVY');
    doc.rect(0, 0, 595, 842).fillColor(PALETTE.DEEP_NAVY).fill();
    drawUzbekBorder(PALETTE.GOLD, 1);

    doc.fillColor(PALETTE.GOLD).fontSize(32).font('Helvetica-Bold').text("DAVOMAT TIZIMI", 0, 300, { align: 'center' });
    doc.fillColor(PALETTE.WHITE).fontSize(12).text("Farg'ona viloyati Maktabgacha va maktab ta'limi boshqarmasi uchun IT-markaz tomonidan tayyorlandi.", 50, 400, { align: 'center', width: 495 });

    doc.fontSize(10).fillColor(PALETTE.GOLD).text("© 2026 BARCHA HUQUQLAR HIMOYALANGAN", 0, 780, { align: 'center' });

    doc.end();
    console.log("✅ [MASTERPIECE V2] Jurnal muvaffaqiyatli yaratildi (No Smileys, Corporate Style).");
}

generateMasterpieceV2().catch(console.error);

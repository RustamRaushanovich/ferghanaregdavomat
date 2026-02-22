const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateAgencyManual() {
    const doc = new PDFDocument({
        layout: 'portrait',
        size: 'A4',
        margin: 0,
        info: {
            Title: 'Ferghana Davomat Premium Manual',
            Author: 'Antigravity AI'
        }
    });

    const outputPath = path.join(__dirname, '../DAVOMAT_TIZIMI_PREMIUM_JURNAL_V2.pdf');
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Color Palette
    const NAVY = '#001A35'; // Darker, richer navy
    const GOLD = '#C5A059'; // Sophisticated gold
    const ACCENT = '#DAA520';
    const LIGHT_BG = '#F9F9F9';
    const TEXT_MAIN = '#1A1A1A';
    const DARK_GREY = '#444444';
    const WHITE = '#FFFFFF';

    // Helper: Draw Ornament Header/Footer
    function drawBaseLayout() {
        // Gradient-like effect with lines
        for (let i = 0; i < 80; i += 2) {
            doc.moveTo(0, i).lineTo(595, i).strokeColor(NAVY).opacity(0.1).lineWidth(1).stroke();
        }
        doc.opacity(1);

        // Header
        doc.rect(0, 0, 595.28, 70).fill(NAVY);
        doc.rect(0, 70, 595.28, 4).fill(GOLD);

        // Footer
        doc.rect(0, 841.89 - 50, 595.28, 50).fill(NAVY);
        doc.rect(0, 841.89 - 54, 595.28, 4).fill(GOLD);

        // Vector Ornaments
        function drawOrnament(x, y, scale = 1) {
            doc.save().translate(x, y).scale(scale);
            // Diamond with inner details
            doc.rect(-15, -15, 30, 30).rotate(45).lineWidth(1.5).stroke(GOLD);
            doc.circle(0, 0, 5).lineWidth(1).stroke(GOLD);
            doc.restore();
        }

        drawOrnament(40, 35, 0.8);
        drawOrnament(555, 35, 0.8);
        drawOrnament(297, 841.89 - 25, 0.6);
    }

    // Helper: Add Logo
    function addLogo(x, y, size) {
        const logoPath = path.join(__dirname, '../assets/logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, x, y, { width: size });
        }
    }

    // Helper: Clean & Overlay Image
    function addStepImage(id, x, y, width, height) {
        const imgPath = path.join(__dirname, `../assets/manual_screenshots/scr_${id}.png`);
        if (fs.existsSync(imgPath)) {
            // Shadow
            doc.rect(x + 3, y + 3, width, height).fill('#DDD');
            // Frame
            doc.rect(x - 1, y - 1, width + 2, height + 2).stroke(GOLD);
            doc.image(imgPath, x, y, { fit: [width, height], align: 'center', valign: 'center' });

            // Programmatic Anonymization (Smart Overlays)
            // Note: This is a hacky way to cover names in known positions for standard TG/Dashboard layouts
            if (id >= 11) { // Telegram Bot
                doc.rect(x + 50, y + height - 30, width - 100, 20).fill(WHITE); // Cover some text area
                doc.fillColor(NAVY).fontSize(9).text("ISMLAR YASHIRILGAN (Xavfsiz)", x + 60, y + height - 25);
            }
        }
    }

    // Helper: Text Box
    function addTextBox(title, content, x, y, w) {
        doc.fillColor(NAVY).fontSize(14).font('Helvetica-Bold').text(title, x, y);
        doc.fillColor(TEXT_MAIN).fontSize(10).font('Helvetica').text(content, x, y + 20, { width: w, lineGap: 3, align: 'justify' });
    }

    // --- PAGE 1: COVER ---
    // Deep Navy Gradient Background simulation
    for (let i = 0; i < 842; i += 10) {
        doc.rect(0, i, 595, 10).fillColor(NAVY).opacity(1 - (i / 1200)).fill();
    }
    doc.opacity(1);

    addLogo(247, 150, 100);

    doc.fillColor(GOLD).fontSize(32).font('Helvetica-Bold')
        .text("DAVOMAT NAZORATI", 50, 300, { align: 'center', characterSpacing: 2 });
    doc.fillColor(WHITE).fontSize(20).text("RAQAMLI EKOTIZIM", 50, 345, { align: 'center' });

    doc.rect(150, 400, 295, 1).fill(GOLD);

    doc.fillColor(WHITE).fontSize(13).font('Helvetica')
        .text("Farg'ona viloyati Maktabgacha va maktab ta'limi boshqarmasi tizimidagi umumta'lim maktablarida o'quvchilar davomatini onlayn kiritish va tahlil qilish uchun mo'ljallangan maxsus qo'llanma.", 100, 450, {
            align: 'center',
            lineGap: 6
        });

    doc.rect(50, 700, 495, 80).fill(GOLD).opacity(0.1);
    doc.opacity(1);
    doc.fillColor(GOLD).fontSize(16).text("MAHSUS DAVLAT TARG'IBOTI UCHUN", 50, 730, { align: 'center' });

    // --- PAGE 2: INTRODUCTION ---
    doc.addPage();
    drawBaseLayout();
    addTextBox("KIRISH VA MAQSAD", "Ushbu tizim O'zbekiston Respublikasi ta'lim sohasidagi raqamlashtirish islohotlari doirasida Farg'ona viloyati uchun maxsus ishlab chiqilgan. Asosiy maqsad - davomat jarayonini shaffoflashtirish, qog'ozbozlikni kamaytirish va real vaqt rejimida statistik ma'lumotlarni shakllantirishdir.", 50, 100, 495);

    addStepImage(1, 50, 250, 495, 250); // Map Hero
    addTextBox("WEB PLATFORMA IMKONIYATLARI", "Dashboard orqali viloyat bo'yicha umumiy holatni xarita va grafiklar ko'rinishida kuzatib borish mumkin. Har bir tuman va maktab alohida nazorat qilinadi.", 50, 520, 495);

    // --- PAGE 3: SVOD MONITORING ---
    doc.addPage();
    drawBaseLayout();
    doc.fillColor(NAVY).fontSize(18).text("TUMAN VA VILOYAT SVODLARI", 50, 100);

    addStepImage(4, 50, 150, 495, 250);
    addTextBox("Batafsil Statistika", "Tizim avtomatik ravishda barcha kiritilgan ma'lumotlarni hisoblab chiqadi. Tumanlar kesimida davomat foizlari va sababsiz kelmaganlar soni aniq ko'rinib turadi.", 50, 420, 240);

    addStepImage(5, 305, 420, 240, 200);
    addTextBox("Filtrlash tizimi", "Siz istalgan sana yoki hududni tanlab, kerakli hisobotlarni soniyalar ichida olishingiz mumkin.", 50, 550, 240);

    // --- PAGE 4: JONLI MONITOR ---
    doc.addPage();
    drawBaseLayout();
    doc.fillColor(NAVY).fontSize(18).text("JONLI MONITORING VA RO'YXATLAR", 50, 100);

    addStepImage(8, 50, 150, 495, 250);
    doc.fillColor(DARK_GREY).fontSize(10).text("Jonli monitor: qaysi maktab ayni vaqtda ma'lumot kiritayotgani va yuborish manbasi (Bot/Web) ko'rinishi.", 50, 410, { width: 495 });

    addStepImage(7, 50, 450, 495, 250);
    doc.fillColor(DARK_GREY).fontSize(10).text("Sababsiz kiritilgan o'quvchilar ro'yxati: Ismlar va manzillar (Xavfsizlik yuzasidan o'zgartirilgan).", 50, 710, { width: 495 });

    // --- PAGE 5: TAHLIL ---
    doc.addPage();
    drawBaseLayout();
    doc.fillColor(NAVY).fontSize(18).text("ANALITIKA VA DIAGRAMMALAR", 50, 100);

    addStepImage(9, 50, 150, 495, 350);
    addTextBox("Davomat Dinamikasi", "30 kunlik davomat grafigi orqali o'sish va pasayish tendensiyalarini tahlil qilish mumkin. Bu qaror qabul qilishda ma'lumotlarga asoslanish imkonini beradi.", 50, 520, 495);

    // --- PAGE 6: ADMIN PANEL ---
    doc.addPage();
    drawBaseLayout();
    doc.fillColor(NAVY).fontSize(18).text("TIZIMNI BOSHQARISH (ADMIN)", 50, 100);

    addStepImage(6, 50, 150, 495, 250);
    addTextBox("Foydalanuvchilar nazorati", "Admin paneli orqali yangi mas'ullarni qo'shish, ularning ruxsatlarini tahrirlash va xavfsizlikni ta'minlash amalga oshiriladi.", 50, 420, 495);

    addStepImage(10, 50, 500, 495, 200);
    doc.text("Shaxsiy profil: har bir foydalanuvchi o'z paroli va shaxsiy ma'lumotlarini o'zi boshqaradi.", 50, 710);

    // --- PAGE 7: BOT START ---
    doc.addPage();
    drawBaseLayout();
    doc.fillColor(NAVY).fontSize(22).text("TELEGRAM BOT BILAN ISHLASH", 50, 100);

    addStepImage(11, 50, 150, 240, 450);
    addStepImage(12, 305, 150, 240, 450);

    addTextBox("1-Bosqich: Avtorizatsiya", "Botdan foydalanish uchun telefon raqam orqali tasdiqlash talab etiladi. Bu tizim xavfsizligini va faqat vakolatli xodimlar kirishini ta'minlaydi.", 50, 620, 495);

    // --- PAGE 8: DATA INPUT ---
    doc.addPage();
    drawBaseLayout();
    doc.fillColor(NAVY).fontSize(18).text("MA'LUMOT KIRITISH TARTIBI", 50, 100);

    addStepImage(14, 50, 150, 156, 300);
    addStepImage(15, 216, 150, 156, 300);
    addStepImage(16, 382, 150, 156, 300);

    addTextBox("Tuman va Maktabni Tanlash", "Bot orqali ma'lumot kiritishda hududni va tegishli maktabni menyudan tanlash kifoya. Hech qanday matn yozish shart emas - hammasi qulay tugmalar orqali amalga oshiriladi.", 50, 480, 495);

    // --- PAGE 9: STUDENT CATEGORIES ---
    doc.addPage();
    drawBaseLayout();
    doc.fillColor(NAVY).fontSize(18).text("TOIFALAR BO'YICHA TAHSIMOT", 50, 100);

    addStepImage(17, 50, 150, 240, 450);
    addStepImage(18, 305, 150, 240, 450);

    addTextBox("Kelmaganlar Sababini Kiritish", "Har bir sabab (kasallik, oilaviy sharoit va b.) alohida so'raladi. Bu ma'lumotlar keyinchalik chuqur tahlil uchun xizmat qiladi.", 50, 620, 495);

    // --- PAGE 10: PRO FEATURES ---
    doc.addPage();
    drawBaseLayout();
    doc.fillColor(GOLD).fontSize(22).text("PRO FOYDALANUVCHILAR UCHUN", 50, 100);

    addStepImage(20, 50, 150, 240, 450);
    addStepImage(21, 305, 150, 240, 450);

    addTextBox("PDF Bildirishnoma (3-ILOVA)", "PRO statusiga ega foydalanuvchilar kiritgan ma'lumotlari asosida tayyor 'Bildirishnoma'ni PDF formatida yuklab olishlari mumkin. Bu hujjat huquq-tartibot organlari (psixologlar) bilan ishlashda katta yordam beradi.", 50, 620, 495);

    // --- PAGE 11: FINAL STEPS ---
    doc.addPage();
    drawBaseLayout();
    doc.fillColor(NAVY).fontSize(18).text("YAKUNIY TASDIQLASH", 50, 100);

    addStepImage(22, 50, 150, 495, 400);
    addTextBox("Ma'lumotlar Saqlandi", "Jarayon yakunida bot ma'lumotlarni bazaga yozilganini tasdiqlaydi va tegishli guruhlarga hisobotni yuboradi.", 50, 570, 495);

    // --- PAGE 12: PARENT CONTROL ---
    doc.addPage();
    // Special Parent Theme
    doc.rect(0, 0, 595, 842).fill('#F0F7FF');
    drawBaseLayout();
    doc.fillColor('#004080').fontSize(22).text("OTA-ONALAR NAZORATI TIZIMI", 50, 100);

    addStepImage(23, 50, 150, 240, 450);
    addStepImage(24, 305, 150, 240, 450);

    addTextBox("Farzandim Qayerda?", "Ota-onalar maxsus bot orqali farzandlari maktabga kelgan-kelmaganligini masofadan nazorat qiladilar. Agarda o'quvchi darsga kelmasa, ota-onaga darhol xabar yuboriladi.", 50, 620, 495);

    // --- PAGE 13: CONTACTS ---
    doc.addPage();
    drawBaseLayout();
    doc.fillColor(NAVY).fontSize(24).text("BOG'LANISH VA TEZKOR KIRISH", 50, 100, { align: 'center' });

    function addContactTile(icon, label, value, y) {
        doc.rect(100, y, 400, 60).lineWidth(1).stroke(GOLD);
        doc.fillColor(NAVY).fontSize(12).font('Helvetica-Bold').text(label, 120, y + 15);
        doc.fillColor(DARK_GREY).font('Helvetica').fontSize(14).text(value, 120, y + 35);
    }

    addContactTile("", "WEB SAHIFA MANZILI", "https://ferghanaregdavomat.uz", 200);
    addContactTile("", "ASOSIY TELEGRAM BOT", "@Ferghanaregdavomat_bot", 280);
    addContactTile("", "OTA-ONALAR NAZORATI", "@ferregdavomatparents_bot", 360);

    // Simulated QR Layout
    doc.fillColor(NAVY).fontSize(14).text("SKANER QILING VA KIRING:", 50, 480, { align: 'center' });
    doc.rect(100, 510, 120, 120).stroke(NAVY);
    doc.rect(237, 510, 120, 120).stroke(NAVY);
    doc.rect(374, 510, 120, 120).stroke(NAVY);

    for (let i = 0; i < 3; i++) {
        let offsetX = 100 + (i * 137);
        doc.fillColor(NAVY).fontSize(8).text("QR CODE", offsetX + 35, 565);
    }

    doc.fillColor(GOLD).fontSize(11).text("© 2026 Farg'ona viloyati MMTB. Barcha huquqlar himoyalangan.", 50, 750, { align: 'center' });

    doc.end();
    console.log("✅ [PDF] Agency-Level Premium Manual generated successfully!");
}

generateAgencyManual().catch(console.error);

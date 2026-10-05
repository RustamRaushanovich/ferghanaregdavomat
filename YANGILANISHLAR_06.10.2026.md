# 🚀 DAVOMAT TIZIMI — YANGILANISHLAR VA GITHUB/RENDER UCHUN YO'RIQNOMA
**Versiya:** 2.0 (06.10.2026, soat 03:20)  
**Holati:** Production / GitHub & Render uchun 100% tayyor

---

## 📌 BUGUN (06.10.2026) AMALGA OSHIRILGAN BARCHA O'ZGARTIRISHLAR:

### 1. 🏫 Uchko'prik tumani 2-IDUM -> 18-maktabga o'zgartirildi:
- `src/database/schools.json` da Uchko'prik tumanida `2-IDUMI` olib tashlanib, tartib bilan `18-maktab` qo'yildi.
- `src/database/users_db.json` dagi barcha foydalanuvchilar 18-maktabga o'tkazildi.
- `src/database/pg.js` ga avtomatik SQL migratsiyasi kiritildi: o'tmishdagi barcha davomat yozuvlari (`attendance`), cheklar va o'quvchilar ro'yxati to'liq saqlanib, 18-maktabga bog'landi (hech narsa o'chib ketmadi).

### 2. ⏰ O'zbekiston vaqti (UTC+5 / Asia/Tashkent) to'liq moslashtirildi:
- `src/utils/fargona.js` fayli `moment-timezone` asosida yangilandi.
- Chek yuborilgan vaqt (`submitted_at`) va adminga boradigan xabardagi vaqt O'zbekiston/Toshkent mahalliy vaqtida ko'rsatiladi.
- `dashboard/admin.html` da cheklar ro'yxati xalqaro serverlarda ham aniq Toshkent vaqti bilan chiqadi.

### 3. 🛡️ Huquqiy himoya va Ommaviy Oferta (Terms of Service):
- Davlat soliq qo'mitasining **QR-kodli Ma'lumotnomasi № 0006296129** («Dasturiy ta'minot ishlab chiqish») asosida rasmiy Ommaviy oferta ishlab chiqildi (`src/utils/oferta.js` va `dashboard/oferta.html`).
- Tizimda **«Darvoza» (Gatekeeper)** joriy etildi: foydalanuvchi «✅ Tanishdim va roziman» tugmasini bosmaguncha davomat kiritishga ruxsat berilmaydi.
- Menyuda `📋 Ommaviy Oferta` tugmasi va `/oferta` buyrug'i qo'shildi.

### 4. 💳 Click va Payme orqali «1 bosishda to'lash» (Deep-Link):
- `src/services/paymentService.js` da to'lov xabariga to'g'ridan-to'g'ri `[📲 Click orqali to'lash]` va `[📲 Payme orqali to'lash]` havolalari qo'shildi.
- Foydalanuvchi kartani qo'lda terib o'tirmaydi, summa va karta raqami ilovada tayyor chiqadi.

### 5. ⏰ Obuna tugashidan 3 kun va 1 kun oldin Avtomatik Eslatma:
- `src/services/scheduler.js` da har kuni ertalab soat 08:30 da avtomatik ishga tushuvchi cron-vazifa qo'shildi.
- Obunasi tugashiga 3 kun va 1 kun qolgan maktab mas'ullariga to'lov tugmalari bilan birga muloyim eslatma xabari yuboriladi.

### 6. 📄 Davomatdan so'ng tayyor «3-Ilova» PDF hisoboti:
- `src/scenes/attendance.js` da maktab davomatni kiritib bo'lishi bilan (agar sababsiz dars qoldirganlar bo'lsa), bot bir soniyada rasmiy gerbli `3-ILOVA_[Maktab].pdf` hujjatini taqdim etadi.

### 7. 🔍 Chek holatini botda kuzatish (Monitoring):
- `👤 Mening Profilim` bo'limida va to'lov menyusida `[🔍 Yuborgan chekim holati]` tugmasi kiritildi. Foydalanuvchi cheki qabul qilingan yoki kutilayotganini ko'rib turadi.

### 8. 📊 Excel hisobot va Qo'lda 1 oylik limit berish:
- Admin panelda va botda to'lov qilgan obunachilar ro'yxatini Excel formatda yuklab olish tugmasi bor.
- Favqulodda vaziyatlarda Admin paneldan tuman va maktabni tanlab 1 oylik limit qo'shib berish imkoni mavjud.

---

## 🚀 GITHUB GA YUKLASH VA RENDER DA ISHGA TUSHIRISH QADAMLARI:

### 1-qadam: GitHub Repozitoriyasiga yuklash
1. Brauzerda o'zingizning GitHub hisobingizga kiring.
2. `ferghanaregdavomat` repozitoriyasini oching.
3. Ushbu yangi papka (`git hub uchun 06.10.2026_03.20`) ichidagi barcha fayllarni GitHub ga yuklang (Commit & Push qiling).
   *(Diqqat: `node_modules` papkasi kerak emas, u repozitoriyga yuklanmaydi).*

### 2-qadam: Render.com da avtomatik deploy
- Repozitoriyga yangi commit tushishi bilan Render.com avtomatik ravishda `npm install` va `node index.js` ni ishga tushiradi.
- Barcha yangilanishlar shu zahotiyoq jonli efirda (Live) ishlay boshlaydi!

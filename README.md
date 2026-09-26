# 📊 Farg'ona Viloyati Maktablari Davomat Monitoring Platformasi va Telegram Boti

Ushbu loyiha Farg'ona viloyatidagi 19 ta tuman va shaharlardagi umumiy o'rta ta'lim maktablarining kunlik o'quvchilar davomatini real vaqt rejimida yig'ish, tahlil qilish, nazorat qilish va avtomatlashtirilgan hisobotlarni shakllantirish uchun ishlab chiqilgan yaxlit axborot tizimidir.

---

## 🌟 Asosiy Imkoniyatlar

1. **Telegram Bot orqali davomat yig'ish:**
   - 19 ta tuman/shahardagi maktablar uchun qulay va bosqichli kiritish interfeysi (Wizard).
   - O'zbek tilidagi barcha apostroflarni (`‘`, `’`, `'`, `ʻ`, `ʼ`) to'liq tushunuvchi aqlli moslashtirish (fuzzy-match).
   - Sababli va sababsiz dars qoldirgan o'quvchilar hisobi.

2. **Web Dashboard (Interaktiv boshqaruv paneli):**
   - Viloyat va tumanlar bo'yicha real-time kunlik tahlil (Svod).
   - 1-Oktyabr "O'qituvchi va murabbiylar kuni" maxsus bayram kartasi va tabrik interfeysi.
   - Excel (`.xlsx`) formatida to'liq jadval va hisobotlarni yuklab olish.
   - Inspektor-psixologlar va superadmin uchun kengaytirilgan analitika paneli.

3. **To'lov va Obuna tizimi (5-Oktyabrdan):**
   - 05.10.2026 sanasidan boshlab oylik obuna tizimi.
   - To'lov muddati to'langan kundan boshlab aynan 1 oy muddatga (keyingi oyning shu sanasigacha) hisoblanadi.
   - To'lov muddati tugashiga 3 kun va 1 kun qolganda avtomatik ogohlantirish (Cron).
   - **Anti-Fraud (Soxta chekdan himoya):** Telegram `file_unique_id` orqali bir xil chekni qayta ishlatish va firibgarlik urinishlarini avtomatik fosh etish.

4. **Avtomatlashtirilgan Hisobotlar (Cron Scheduler):**
   - Har kuni soat 16:30 da yakuniy viloyat Svodini va Excel hisobotini Telegram guruhga avto-jo'natish.
   - Topshirmagan maktablarga avtomatik eslatmalar.

---

## 🛠 O'rnatish va Ishga Tushirish

### 1. Talablar:
- [Node.js](https://nodejs.org/) (v18 yoki undan yuqori)
- NPM yoki Yarn

### 2. O'rnatish:
```bash
# Loyihani klonlash
git clone https://github.com/USERNAME/ferghanareg-davomat.git
cd ferghanareg-davomat

# Kerakli kutubxonalarni o'rnatish
npm install
```

### 3. Sozlash (.env):
`.env.example` faylidan nusxa olib, `.env` faylini yarating va o'z kalitlaringizni kiriting:
```ini
BOT_TOKEN=your_telegram_bot_token
PORT=3000
REPORT_GROUP_ID=-100xxxxxxxxxx
DATABASE_URL=  # Ixtiyoriy: Supabase/PostgreSQL (bo'lmasa SQLite avtomatik ishlaydi)
```

### 4. Ishga tushirish:
```bash
# Ishga tushirish
npm start

# Yoki Windows tizimida:
run.bat
```
Web platforma brauzerda: `http://localhost:3000`

---

## 👥 Tizim Foydalanuvchilari

- **Superadmin:** `mrqirol` / Parol: `2323`
- **Viloyat boshqarma:** `VMMTB` / Parol: `1234`
- **Tumanlar:** Har bir tuman nomi (masalan: `fargonash`, `margilonsh`, `quvat`) / Parol: `123`

---

## 📄 Litsenziya
Ushbu loyiha maxsus buyurtma asosida ishlab chiqilgan.
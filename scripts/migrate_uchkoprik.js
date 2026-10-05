const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
    console.log("🚀 Uchko'prik 2-IDUM -> 18-maktab migratsiyasi boshlandi...");

    // 1. users_db.json yangilash
    const usersPath = path.join(__dirname, '../src/database/users_db.json');
    if (fs.existsSync(usersPath)) {
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        let updatedCount = 0;
        for (const [uid, user] of Object.entries(users)) {
            const district = (user.district || '').toLowerCase();
            const school = (user.school || '').trim();
            if (district.includes('uchko') || district.includes("uchko'prik")) {
                if (school === '2-IDUM' || school === '2-IDUMI' || school === '2 IDUM' || school === '2 IDUMI') {
                    console.log(`[users_db.json] Foydalanuvchi topildi: ID ${uid} (${user.fio || user.name}), Maktab: ${user.school} -> 18-maktab`);
                    user.school = '18-maktab';
                    updatedCount++;
                }
            }
        }
        if (updatedCount > 0) {
            fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
            console.log(`✅ [users_db.json] ${updatedCount} ta foydalanuvchi 18-maktabga yangilandi.`);
        } else {
            console.log("ℹ️ [users_db.json] Uchko'prik 2-IDUM ga bog'liq foydalanuvchilar topilmadi.");
        }
    }

    // 2. SQLite (davomat.db) yangilash
    const sqlitePath = path.join(__dirname, '../src/database/davomat.db');
    if (fs.existsSync(sqlitePath)) {
        try {
            const Database = require('better-sqlite3');
            const db = new Database(sqlitePath);
            
            // attendance jadvalini tekshirish
            const attendanceCheck = db.prepare("SELECT COUNT(*) as cnt FROM attendance WHERE (district LIKE '%Uchko%' OR district LIKE '%uchko%') AND (school = '2-IDUM' OR school = '2-IDUMI' OR school = '2 IDUM' OR school = '2 IDUMI')").get();
            console.log(`[SQLite attendance] Uchko'prik 2-IDUM ga oid yozuvlar soni: ${attendanceCheck.cnt}`);
            if (attendanceCheck.cnt > 0) {
                const info = db.prepare("UPDATE attendance SET school = '18-maktab' WHERE (district LIKE '%Uchko%' OR district LIKE '%uchko%') AND (school = '2-IDUM' OR school = '2-IDUMI' OR school = '2 IDUM' OR school = '2 IDUMI')").run();
                console.log(`✅ [SQLite attendance] ${info.changes} ta davomat yozuvi 18-maktabga o'tkazildi (ma'lumotlar saqlab qolindi).`);
            }
            db.close();
        } catch (e) {
            console.error("⚠️ [SQLite Error]:", e.message);
        }
    }

    // 3. PostgreSQL (Supabase) yangilash
    if (process.env.DATABASE_URL) {
        try {
            const pg = require('../src/database/pg');
            // attendance
            const resAtt = await pg.query("UPDATE attendance SET school = '18-maktab' WHERE (district ILIKE '%Uchko%' OR district ILIKE '%Uchko''prik%') AND (school = '2-IDUM' OR school = '2-IDUMI' OR school = '2 IDUM' OR school = '2 IDUMI') RETURNING id");
            console.log(`✅ [PostgreSQL attendance] ${resAtt.rows.length} ta yozuv 18-maktabga yangilandi.`);

            // xorij_students (agar mavjud bo'lsa)
            try {
                const resXorij = await pg.query("UPDATE xorij_students SET school = '18-maktab' WHERE (district ILIKE '%Uchko%') AND (school = '2-IDUM' OR school = '2-IDUMI') RETURNING id");
                console.log(`✅ [PostgreSQL xorij_students] ${resXorij.rows.length} ta yozuv 18-maktabga yangilandi.`);
            } catch (err) {}

            // payment_receipts
            try {
                const resPay = await pg.query("UPDATE payment_receipts SET school = '18-maktab' WHERE (district ILIKE '%Uchko%') AND (school = '2-IDUM' OR school = '2-IDUMI') RETURNING id");
                console.log(`✅ [PostgreSQL payment_receipts] ${resPay.rows.length} ta yozuv 18-maktabga yangilandi.`);
            } catch (err) {}

            // tg_users jsonb ichidagi school
            try {
                const resUsers = await pg.query(`
                    UPDATE tg_users 
                    SET data = jsonb_set(data, '{school}', '"18-maktab"')
                    WHERE (data->>'district' ILIKE '%Uchko%') AND (data->>'school' = '2-IDUM' OR data->>'school' = '2-IDUMI')
                    RETURNING id
                `);
                console.log(`✅ [PostgreSQL tg_users] ${resUsers.rows.length} ta foydalanuvchi ma'lumoti yangilandi.`);
            } catch (err) {
                console.warn("⚠️ [PostgreSQL tg_users update warning]:", err.message);
            }

            console.log("🎉 PostgreSQL dagi barcha tegishli yozuvlar muvaffaqiyatli saqlanib, maktab nomi yangilandi.");
        } catch (e) {
            console.error("⚠️ [PostgreSQL Error]:", e.message);
        }
    } else {
        console.log("ℹ️ [PostgreSQL] DATABASE_URL topilmadi, faqat lokal fayllar yangilandi.");
    }

    console.log("🏁 Migratsiya yakunlandi.");
}

run().catch(console.error);

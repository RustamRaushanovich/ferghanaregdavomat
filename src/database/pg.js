const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initDb() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                date DATE,
                time TEXT,
                district TEXT,
                school TEXT,
                classes_count INTEGER,
                total_students INTEGER,
                sababli_kasal INTEGER,
                sababli_tadbirlar INTEGER,
                sababli_oilaviy INTEGER,
                sababli_ijtimoiy INTEGER,
                sababli_boshqa INTEGER,
                sababli_jami INTEGER,
                sababsiz_muntazam INTEGER,
                sababsiz_qidiruv INTEGER,
                sababsiz_chetel INTEGER,
                sababsiz_boyin INTEGER,
                sababsiz_ishlab INTEGER,
                sababsiz_qarshilik INTEGER,
                sababsiz_jazo INTEGER,
                sababsiz_nazoratsiz INTEGER,
                sababsiz_boshqa INTEGER,
                sababsiz_turmush INTEGER,
                sababsiz_jami INTEGER,
                total_absent INTEGER,
                percent NUMERIC,
                fio TEXT,
                phone TEXT,
                inspector TEXT,
                user_id BIGINT,
                source TEXT,
                bildirgi TEXT
            );
            ALTER TABLE attendance ADD COLUMN IF NOT EXISTS bildirgi TEXT;
            CREATE TABLE IF NOT EXISTS absent_students (
                id SERIAL PRIMARY KEY,
                attendance_id INTEGER REFERENCES attendance(id),
                class TEXT,
                name TEXT,
                address TEXT,
                parent_name TEXT,
                parent_phone TEXT
            );
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id TEXT,
                action TEXT,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS password_history (
                id SERIAL PRIMARY KEY,
                username TEXT,
                old_password TEXT,
                new_password TEXT,
                changed_by TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS tg_users (
                id TEXT PRIMARY KEY,
                data JSONB,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value JSONB
            );
            CREATE TABLE IF NOT EXISTS dashboard_users (
                login TEXT PRIMARY KEY,
                data JSONB
            );
        `);
        console.log("🐘 PostgreSQL tables initialized.");
    } catch (e) {
        console.error("🐘 PostgreSQL Init Error:", e.message);
    }
}

initDb();

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};

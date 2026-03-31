const fs = require('fs');
const path = 'C:\\\\Users\\\\Manaviyat2\\\\.gemini\\\\antigravity\\\\scratch\\\\31.03.2024\\\\src\\\\database\\\\pg.js';
let content = fs.readFileSync(path, 'utf8');

const tableSql = `
            CREATE TABLE IF NOT EXISTS xorij_students (
                id SERIAL PRIMARY KEY,
                name TEXT,
                class TEXT,
                district TEXT,
                school TEXT,
                country TEXT,
                reason TEXT,
                leave_date DATE,
                return_date DATE,
                parent_phone TEXT,
                added_by TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
`;

const target = "CREATE TABLE IF NOT EXISTS attendance";
if (content.includes(target) && !content.includes('xorij_students')) {
    content = content.replace(target, tableSql + target);
    fs.writeFileSync(path, content);
    console.log("PostgreSQL table xorij_students added to schema.");
}

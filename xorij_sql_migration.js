const fs = require('fs');
const indexPath = 'C:\\\\Users\\\\Manaviyat2\\\\.gemini\\\\antigravity\\\\scratch\\\\31.03.2024\\\\index.js';
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Add Export DB Endpoint
const adminExportApi = `
// Admin: Export Full SQL Data (Only for Owner/Primary Admin)
app.get('/api/admin/export-db', auth, async (req, res) => {
    const isOwner = req.user.username === 'qirol' || Number(req.user.uid) === 65002404;
    if (!isOwner) return res.status(403).json({ error: 'Ruxsat yo\\'q! Faqat asosiy admin uchun.' });

    try {
        const attendance = await sqlite.query('SELECT * FROM attendance ORDER BY id DESC LIMIT 5000');
        const xorij = await sqlite.query('SELECT * FROM xorij_students ORDER BY id DESC');
        const users = await sqlite.query('SELECT id, data, last_active FROM tg_users');
        
        const dump = {
            export_date: new Date().toISOString(),
            attendance_count: attendance.rowCount,
            xorij_count: xorij.rowCount,
            users_count: users.rowCount,
            data: {
                attendance: attendance.rows,
                xorij: xorij.rows,
                users: users.rows
            }
        };

        res.setHeader('Content-disposition', 'attachment; filename=database_backup.json');
        res.setHeader('Content-type', 'application/json');
        res.write(JSON.stringify(dump, null, 2));
        res.end();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
`;

// 2. Replace Xorij ADD logic to use PostgreSQL
const oldXorijAdd = /app\.post\('\/api\/xorij\/add', auth, upload\.fields\([\s\S]*?\), \(req, res\) => {[\s\S]*?}\);/m;
const newXorijAdd = `app.post('/api/xorij/add', auth, upload.fields([
    { name: 'doc_qaror', maxCount: 1 },
    { name: 'doc_buyruq', maxCount: 1 }
]), async (req, res) => {
    try {
        const { district, school, student_name, dob, class_name, country, date_left, reason, parent_phone } = req.body;
        
        const q = 'INSERT INTO xorij_students (name, class, district, school, country, reason, leave_date, parent_phone, added_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id';
        const values = [student_name, class_name, district, school, country, reason, date_left, parent_phone, req.user.username];
        
        const result = await sqlite.query(q, values);
        res.json({ success: true, id: result.rows[0].id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});`;

// 3. Replace Xorij LIST logic to use PostgreSQL
const oldXorijList = /app\.get\('\/api\/xorij\/my-students', auth, \(req, res\) => {[\s\S]*?}\);/m;
const newXorijList = `app.get('/api/xorij/my-students', auth, async (req, res) => {
    try {
        const { district, school } = req.query;
        if (!district || !school) return res.status(400).json([]);
        
        const q = 'SELECT * FROM xorij_students WHERE district = $1 AND school = $2 ORDER BY id DESC';
        const result = await sqlite.query(q, [district, school]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json([]);
    }
});`;

if (content.includes("/api/admin/reset-password")) {
    content = content.replace("/api/admin/reset-password", "/api/admin/reset-password" + adminExportApi);
}

if (oldXorijAdd.test(content)) content = content.replace(oldXorijAdd, newXorijAdd);
if (oldXorijList.test(content)) content = content.replace(oldXorijList, newXorijList);

fs.writeFileSync(indexPath, content);
console.log("Xorij SQL migration and Export API added.");

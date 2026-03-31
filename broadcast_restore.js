const fs = require('fs');
const indexPath = 'C:\\\\Users\\\\Manaviyat2\\\\.gemini\\\\antigravity\\\\scratch\\\\31.03.2024\\\\index.js';
let content = fs.readFileSync(indexPath, 'utf8');

const startMarker = "// Admin: Broadcast message";
const endMarker = "// Admin: List Archived Reports";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const head = content.substring(0, startIndex);
    const tail = content.substring(endIndex);
    
    const newMiddle = `// Admin: Broadcast message (Supports Files)
app.post('/api/admin/broadcast', auth, upload.single('file'), async (req, res) => {
    const isOwner = req.user.username === 'qirol';
    if (req.user.role !== 'superadmin' && !isOwner) return res.status(403).json({ error: 'Ruxsat yo\\'q' });

    const { message, group } = req.body;
    if (!message) return res.status(400).json({ error: 'Xabar matni bo\\'sh' });

    const file = req.file;

    // Filter recipients from users_db
    const users = Object.entries(db.users_db);
    let targetUids = [];

    if (group === 'inspectors') {
        targetUids = users.filter(([uid, u]) => u.district || u.role === 'inspektor_psixolog').map(([uid]) => uid);
    } else if (group === 'parents') {
        targetUids = users.filter(([uid, u]) => u.role === 'parent').map(([uid]) => uid);
    } else {
        targetUids = users.map(([uid]) => uid);
    }

    // UNIQUE and VALID IDs
    targetUids = [...new Set(targetUids)].filter(id => id && !isNaN(id));

    res.json({ success: true, estimated_users: targetUids.length });

    // Background broadcasting
    (async () => {
        let sent = 0;
        let blocked = 0;
        const path = require('path');

        for (const uid of targetUids) {
            try {
                if (file) {
                    const filePath = path.join(__dirname, 'assets', 'uploads', file.filename);
                    if (file.mimetype.startsWith('image/')) {
                        await bot.telegram.sendPhoto(uid, { source: filePath }, { caption: message, parse_mode: 'HTML' });
                    } else {
                        await bot.telegram.sendDocument(uid, { source: filePath }, { caption: message, parse_mode: 'HTML' });
                    }
                } else {
                    await bot.telegram.sendMessage(uid, message, { parse_mode: 'HTML' });
                }
                sent++;
            } catch (e) {
                blocked++;
            }
            await new Promise(r => setTimeout(r, 60)); // Avoid flood limits
        }
        console.log(\`[BROADCAST] Finished. Sent: \${sent}, Blocked: \${blocked}\`);
    })();
});\n\n`;

    fs.writeFileSync(indexPath, head + newMiddle + tail);
    console.log("Broadcast endpoint restored and enhanced.");
} else {
    console.log("Broadcast markers NOT found.");
}

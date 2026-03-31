const fs = require('fs');
const fPath = 'C:\\\\Users\\\\Manaviyat2\\\\.gemini\\\\antigravity\\\\scratch\\\\31.03.2024\\\\dashboard\\\\admin.html';
let content = fs.readFileSync(fPath, 'utf8');

const backupSection = `
            <!-- Database Backup Section -->
            <div class="card" id="dbBackupCard">
                <h3><i class="fas fa-database"></i> Baza ma'lumotlarini yuklab olish</h3>
                <div style="background:rgba(16,185,129,0.05); padding:15px; border-radius:12px; margin-bottom:15px; font-size:0.85rem; color:#94a3b8;">
                    <i class="fas fa-shield-alt"></i> Ushbu funksiya faqat <b>Asosiy Admin</b> (R.R. Turdiyev) uchun ishlayди. 
                    Barcha davomat, xorijiy o'quvchilar ва Telegram foydalanuvchilarini JSON formatda saqlab olish imkoniyati.
                </div>
                <button onclick="downloadBackup()" class="btn btn-primary" style="width:100%; background: #10b981; border: none; box-shadow: 0 10px 20px rgba(16,185,129,0.2);">
                    <i class="fas fa-download"></i> Ma'lumotlarni saqlash (Backup)
                </button>
            </div>
`;

const jsFunction = `
        async function downloadBackup() {
            if(!confirm("Barcha baza ma'lumotlarini (Xorij, Davomat, Userlar) JSON formatda yuklab olishni tasdiqlaysizmi?")) return;
            
            try {
                const res = await fetch('/api/admin/export-db', {
                    headers: { 'Authorization': token }
                });
                if(res.status === 403) return alert("Ruxsat yo'q! Faqat Asosiy Admin uchun.");
                if(!res.ok) throw new Error("Yuklab olishda xatolik!");

                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = \`davomat_db_backup_\${new Date().toISOString().split('T')[0]}.json\`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                addLog("[ACTION] Database backup downloaded");
            } catch(e) { alert("Xatolik: " + e.message); }
        }
`;

// Insert UI after PRO Manager
if (content.includes('id="proManagerCard"')) {
    content = content.replace('<!-- Extra Tools -->', backupSection + '<!-- Extra Tools -->');
}

// Insert JS
if (content.includes('</script>')) {
    content = content.replace('</script>', jsFunction + '</script>');
}

fs.writeFileSync(fPath, content);
console.log("Admin Panel backup UI added.");

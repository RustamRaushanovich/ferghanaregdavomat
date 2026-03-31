const fs = require('fs');
const authPath = 'C:\\\\Users\\\\Manaviyat2\\\\.gemini\\\\antigravity\\\\scratch\\\\31.03.2024\\\\src\\\\utils\\\\auth.js';
let authContent = fs.readFileSync(authPath, 'utf8');

// 1. Add VMMTB as 'admin' (restricted role)
const newSeeds = `    const seedUsers = {
        "mrqirol": { password: "2323", role: "superadmin", district: null },
        "VMMTB": { password: "1234", role: "admin", district: null }
    };`;

authContent = authContent.replace(/const seedUsers = \{[\s\S]*?\};/, newSeeds);
fs.writeFileSync(authPath, authContent);

// 2. Update admin.html UI Restriction logic in index.js and admin.html
const indexPath = 'C:\\\\Users\\\\Manaviyat2\\\\.gemini\\\\antigravity\\\\scratch\\\\31.03.2024\\\\index.js';
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Update /api/login response to include full user object for frontend role-based UI
indexContent = indexContent.replace('token,', 'token, role: user.role,');

// Ensure only superadmin can access pro settings
indexContent = indexContent.replace("app.post('/api/admin/set-pro', auth,", "app.post('/api/admin/set-pro', auth, (req, res, next) => { if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Faqat superadmin uchun' }); next(); }, ");

fs.writeFileSync(indexPath, indexContent);

// 3. Update admin.html to hide restricted cards
const adminPath = 'C:\\\\Users\\\\Manaviyat2\\\\.gemini\\\\antigravity\\\\scratch\\\\31.03.2024\\\\dashboard\\\\admin.html';
let adminContent = fs.readFileSync(adminPath, 'utf8');

const hideScript = `
        // Role based UI restrictions
        function applyRoleRestrictions() {
            const role = localStorage.getItem('user_role');
            if (role === 'admin') {
                const proCards = document.querySelectorAll('#proManagerCard, #dbBackupCard');
                proCards.forEach(c => c.style.display = 'none');
                
                const proLinks = document.querySelectorAll('a[href="#proManagerCard"], a[href="#dbBackupCard"]');
                proLinks.forEach(l => l.style.visibility = 'hidden');
                
                addLog("[SYSTEM] Admin account access restricted.");
            }
        }
        applyRoleRestrictions();
`;

adminContent = adminContent.replace('</script>', hideScript + '</script>');
fs.writeFileSync(adminPath, adminContent);

console.log("Restricted admin 'VMMTB' added and UI hidden from sensitive tools.");

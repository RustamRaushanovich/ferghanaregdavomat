const fs = require('fs');
const authPath = 'C:\\\\Users\\\\Manaviyat2\\\\.gemini\\\\antigravity\\\\scratch\\\\31.03.2024\\\\src\\\\utils\\\\auth.js';
let authContent = fs.readFileSync(authPath, 'utf8');

// 1. Update Seed Users in auth.js
const oldSeeds = `    const seedUsers = {
        "qirol": { password: "2323", role: "superadmin", district: null },
        "abror4400": { password: "1234", role: "superadmin", district: null },
        "viloyat": { password: "1234", role: "superadmin", district: null },
        "VMMTB": { password: "1234", role: "superadmin", district: null }
    };`;
const newSeeds = `    const seedUsers = {
        "mrqirol": { password: "2323", role: "superadmin", district: null }
    };`;

authContent = authContent.replace(oldSeeds, newSeeds);
fs.writeFileSync(authPath, authContent);

// 2. Update isOwner checks in index.js
const indexPath = 'C:\\\\Users\\\\Manaviyat2\\\\.gemini\\\\antigravity\\\\scratch\\\\31.03.2024\\\\index.js';
let indexContent = fs.readFileSync(indexPath, 'utf8');

indexContent = indexContent.replace(/req\.user\.username === 'qirol'/g, "req.user.username === 'mrqirol'");
indexContent = indexContent.replace(/login !== 'qirol'/g, "login !== 'mrqirol'");
indexContent = indexContent.replace(/targetLogin === 'qirol'/g, "targetLogin === 'mrqirol'");

fs.writeFileSync(indexPath, indexContent);
console.log("Superadmin account restricted to 'mrqirol'.");

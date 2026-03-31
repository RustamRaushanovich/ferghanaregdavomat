const fs = require('fs');
const path = 'C:\\\\Users\\\\Manaviyat2\\\\.gemini\\\\antigravity\\\\scratch\\\\31.03.2024\\\\index.js';
let content = fs.readFileSync(path, 'utf8');

// Update the receipt forward logic to ONLY use 65002404
const oldLine = 'const admins = config.SUPER_ADMIN_IDS;';
const newLine = 'const admins = [65002404]; // Only primary admin';

content = content.replace(oldLine, newLine);

fs.writeFileSync(path, content);
console.log("Updated receipt forwarding to only target UID 65002404.");

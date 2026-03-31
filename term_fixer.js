const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\Manaviyat2\\.gemini\\antigravity\\scratch\\31.03.2024\\dashboard';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') || f.endsWith('.js'));

files.forEach(file => {
    const fPath = path.join(dir, file);
    let content = fs.readFileSync(fPath, 'utf8');
    
    // Replace "Talabalar" with "O'quvchilar" (plural)
    // Replace "Talaba" with "O'quvchi" (singular)
    
    // Case sensitive replacements
    content = content.replace(/Talabalar/g, "O'quvchilar");
    content = content.replace(/talabalar/g, "o'quvchilar");
    content = content.replace(/Talaba/g, "O'quvchi");
    content = content.replace(/talaba/g, "o'quvchi");
    
    // Also handle Cyrillic if any (though mostly Latin is used)
    content = content.replace(/Талабалар/g, "Ўқувчилар");
    content = content.replace(/талабалар/g, "ўқувчилар");

    fs.writeFileSync(fPath, content);
});

console.log("Updated terminology from Talaba to O'quvchi in all files.");

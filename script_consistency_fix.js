const fs = require('fs');
const path = require('path');

const filesToFix = [
    'C:/Users/Manaviyat2/.gemini/antigravity/scratch/31.03.2024/dashboard/index.html',
    'C:/Users/Manaviyat2/.gemini/antigravity/scratch/31.03.2024/dashboard/davomat.html',
    'C:/Users/Manaviyat2/.gemini/antigravity/scratch/31.03.2024/dashboard/admin.html',
    'C:/Users/Manaviyat2/.gemini/antigravity/scratch/31.03.2024/dashboard/dashboard.html'
];

const replacements = [
    { from: /tayёрлаш/g, to: 'tayyorlash' },
    { from: /Ohalobuna/g, to: 'Obuna' },
    { from: /т/g, to: 't' }, // Sometimes Cyrillic 'т' is used
    { from: /а/g, to: 'a' },
    { from: /е/g, to: 'e' },
    { from: /о/g, to: 'o' },
    { from: /р/g, to: 'r' },
    { from: /л/g, to: 'l' },
    { from: /ш/g, to: 'sh' },
    { from: /PRO-GA O'TISH/g, to: "PRO-ga o'tish" },
    { from: /To'lovni tasdiqlash/g, to: "To'lovni tasdiqlash" }
];

filesToFix.forEach(f => {
    if (fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf8');
        let original = content;

        // Specific fixes first
        content = content.replace(/tayёрлаш/g, 'tayyorlash');
        content = content.replace(/Ohalobuna/g, 'Obuna');
        content = content.replace(/tayёрлaш/g, 'tayyorlash');
        
        // Remove ANY remaining Cyrillic in places where it should be Latin
        // We'll look for mixed words like "tayarлаш"
        content = content.replace(/([a-zA-Z0-9'‘`]+)([а-яА-ЯёЁ]+)/g, (match, p1, p2) => {
            // Very basic transliteration for mixed words
            const map = { 'а': 'a', 'е': 'e', 'ё': 'yo', 'и': 'i', 'о': 'o', 'у': 'u', 'р': 'r', 'л': 'l', 'ш': 'sh', 'т': 't', 'я': 'ya' };
            const fixed = p2.split('').map(c => map[c] || c).join('');
            return p1 + fixed;
        });

        if (content !== original) {
            fs.writeFileSync(f, content);
            console.log(`Fixed mixed script in ${f}`);
        }
    }
});

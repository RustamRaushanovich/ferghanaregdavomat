const fs = require('fs');
const dir = 'C:\\\\Users\\\\Manaviyat2\\\\.gemini\\\\antigravity\\\\scratch\\\\31.03.2024\\\\dashboard\\\\';

// index.html
let index = fs.readFileSync(dir + 'index.html', 'utf8');
index = index.replace('https://t.me/ferghanaregdavomat_bot', 'https://t.me/ferghanaregdavomat_bot?start=pro');
fs.writeFileSync(dir + 'index.html', index);

// davomat.html
let davomat = fs.readFileSync(dir + 'davomat.html', 'utf8');
davomat = davomat.replace('https://t.me/ferghanaregdavomat_bot', 'https://t.me/ferghanaregdavomat_bot?start=pro');
fs.writeFileSync(dir + 'davomat.html', davomat);

console.log("Updated button links to ?start=pro in index.html and davomat.html.");

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const data = [
    {
        "T/r": 1,
        "F.I.SH": "Aliyev Vali G'ani o'g'li",
        "Tug'ilgan sanasi (YYYY-MM-DD)": "2010-05-15",
        "Sinfi": "8-A",
        "Ketgan davlati": "Rossiya",
        "Ketgan sanasi (YYYY-MM-DD)": "2023-09-05",
        "Ketish sababi": "Ota-onasini oldiga",
        "Kim bilan ketgan": "Onasi bilan",
        "Manzil yoki Telefon": "+79991234567"
    },
    {
        "T/r": 2,
        "F.I.SH": "Karimova Malika Tohir qizi",
        "Tug'ilgan sanasi (YYYY-MM-DD)": "2008-11-20",
        "Sinfi": "10-B",
        "Ketgan davlati": "Turkiya",
        "Ketgan sanasi (YYYY-MM-DD)": "2024-01-10",
        "Ketish sababi": "Davolanish uchun",
        "Kim bilan ketgan": "Xolasi bilan",
        "Manzil yoki Telefon": "Istanbul shahri"
    }
];

const ws = XLSX.utils.json_to_sheet(data);

// Adjust column widths
const wscols = [
    {wch: 5},  // T/r
    {wch: 35}, // F.I.SH
    {wch: 25}, // Dob
    {wch: 10}, // Sinfi
    {wch: 15}, // Davlat
    {wch: 25}, // Ketgan sana
    {wch: 25}, // Sababi
    {wch: 20}, // Kim bilan
    {wch: 25}  // Manzil
];
ws['!cols'] = wscols;

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Shablon");

const outputPath = path.join('C:', 'Users', 'Manaviyat2', '.gemini', 'antigravity', 'scratch', '31.03.2026', 'dashboard', 'assets', 'shablon_xorij.xlsx');

// Ensure dir exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

XLSX.writeFile(wb, outputPath);
console.log("Shablon muvaffaqiyatli yaratildi: " + outputPath);

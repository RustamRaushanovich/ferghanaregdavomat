const db = require('../database/sqlite');
const { getFargonaTime } = require('../utils/fargona');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function saveAttendance(data) {
    try {
        const now = getFargonaTime();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const sababli_jami = (data.sababli_kasal || 0) + (data.sababli_tadbirlar || 0) + (data.sababli_oilaviy || 0) + (data.sababli_ijtimoiy || 0) + (data.sababli_boshqa || 0);
        const sababsiz_jami = (data.sababsiz_muntazam || 0) + (data.sababsiz_qidiruv || 0) + (data.sababsiz_chetel || 0) + (data.sababsiz_boyin || 0) + (data.sababsiz_ishlab || 0) + (data.sababsiz_qarshilik || 0) + (data.sababsiz_jazo || 0) + (data.sababsiz_nazoratsiz || 0) + (data.sababsiz_boshqa || 0) + (data.sababsiz_turmush || 0);
        const total_absent = sababli_jami + sababsiz_jami;
        const percent = data.total_students > 0 ? ((data.total_students - total_absent) / data.total_students * 100).toFixed(1) : 0;
        const insert = db.prepare(`INSERT INTO attendance (date, time, district, school, classes_count, total_students, sababli_kasal, sababli_tadbirlar, sababli_oilaviy, sababli_ijtimoiy, sababli_boshqa, sababli_jami, sababsiz_muntazam, sababsiz_qidiruv, sababsiz_chetel, sababsiz_boyin, sababsiz_ishlab, sababsiz_qarshilik, sababsiz_jazo, sababsiz_nazoratsiz, sababsiz_boshqa, sababsiz_turmush, sababsiz_jami, total_absent, percent, fio, phone, inspector, user_id, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        const result = insert.run(dateStr, timeStr, data.district, data.school, data.classes_count, data.total_students, data.sababli_kasal || 0, data.sababli_tadbirlar || 0, data.sababli_oilaviy || 0, data.sababli_ijtimoiy || 0, data.sababli_boshqa || 0, sababli_jami, data.sababsiz_muntazam || 0, data.sababsiz_qidiruv || 0, data.sababsiz_chetel || 0, data.sababsiz_boyin || 0, data.sababsiz_ishlab || 0, data.sababsiz_qarshilik || 0, data.sababsiz_jazo || 0, data.sababsiz_nazoratsiz || 0, data.sababsiz_boshqa || 0, data.sababsiz_turmush || 0, sababsiz_jami, total_absent, percent, data.fio, data.phone, data.inspector, data.user_id, data.source || 'bot');
        const attendanceId = result.lastInsertRowid;
        if (data.students_list && data.students_list.length > 0) {
            const insertStudent = db.prepare(`INSERT INTO absent_students (attendance_id, class, name, address, parent_name, parent_phone) VALUES (?, ?, ?, ?, ?, ?)`);
            for (const s of data.students_list) { insertStudent.run(attendanceId, s.class, s.name, s.address, s.parent_name, s.parent_phone); }
        }
        return true;
    } catch (e) { console.error("SQLite Save Error:", e); return false; }
}

const setStyle = (cell, options = {}) => {
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    if (options.bold) cell.font = { bold: true, size: options.size || 10 };
    if (options.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: options.fill } };
};

async function exportToExcel(date) {
    try {
        const targetDate = date || getFargonaTime().toISOString().split('T')[0];
        const schoolsDb = require('../database/db').schools_db;
        const allDistricts = ["Farg'ona shahri", "Marg'ilon shahri", "Qo'qon shahri", "Quvasoy shahri", "Beshariq tumani", "Bag'dod tumani", "Uchko'prik tumani", "Qo'shtepa tumani", "Farg'ona tumani", "O'zbekiston tumani", "Dang'ara tumani", "Rishton tumani", "So'x tumani", "Toshloq tumani", "Oltiariq tumani", "Furqat tumani", "Buvayda tumani", "Quva tumani", "Yozyovon tumani"];

        const workbook = new ExcelJS.Workbook();

        // --- SHEET 1: VILOYAT SVOD ---
        const sheet1 = workbook.addWorksheet('Viloyat Svod');

        sheet1.mergeCells('A1:X1'); sheet1.getCell('A1').value = `Farg'ona viloyati maktablari kunlik davomati (Sana: ${targetDate})`;
        sheet1.getCell('A1').font = { bold: true, size: 14 }; sheet1.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
        sheet1.getRow(1).height = 30;

        sheet1.mergeCells('A2:A3'); sheet1.getCell('A2').value = "№";
        sheet1.mergeCells('B2:B3'); sheet1.getCell('B2').value = "Tuman (shahar) nomi";
        sheet1.mergeCells('C2:C3'); sheet1.getCell('C2').value = "Jami maktablar";
        sheet1.mergeCells('D2:D3'); sheet1.getCell('D2').value = "Bugun kiritganlar";
        sheet1.mergeCells('E2:E3'); sheet1.getCell('E2').value = "Sinflar soni";
        sheet1.mergeCells('F2:F3'); sheet1.getCell('F2').value = "Jami o'quvchilar";
        sheet1.mergeCells('G2:G3'); sheet1.getCell('G2').value = "Davomat %";
        sheet1.mergeCells('H2:H3'); sheet1.getCell('H2').value = "Jami kelmaganlar";
        sheet1.mergeCells('I2:M2'); sheet1.getCell('I2').value = "Sababli kelmaganlar";
        ["Kasalligi", "Tadbirlar", "Oilaviy", "Ijtimoiy", "Boshqa"].forEach((v, i) => sheet1.getCell(3, 9 + i).value = v);
        sheet1.mergeCells('N2:N3'); sheet1.getCell('N2').value = "Sababsiz jami";
        sheet1.mergeCells('O2:X2'); sheet1.getCell('O2').value = "Shundan Sababsizlar:";
        ["Muntazam", "Qidiruv", "Chet el", "Bo'yin tovlagan", "Ishlab yurgan", "Qarshilik", "Jazo/Tergov", "Nazoratsiz", "Boshqa", "Turmushga chiqqan"].forEach((v, i) => sheet1.getCell(3, 15 + i).value = v);

        for (let r = 2; r <= 3; r++) {
            sheet1.getRow(r).height = 40;
            for (let c = 1; c <= 24; c++) {
                setStyle(sheet1.getCell(r, c), { bold: true, fill: c >= 14 ? 'FFF8CBAD' : 'FFC6E0B4', size: 9 });
            }
        }

        const entries = db.prepare(`SELECT district, count(school) as entries, sum(classes_count) as classes, sum(total_students) as students, sum(sababli_kasal) as sk, sum(sababli_tadbirlar) as st, sum(sababli_oilaviy) as so, sum(sababli_ijtimoiy) as si, sum(sababli_boshqa) as sb, sum(sababsiz_muntazam) as sm, sum(sababsiz_qidiruv) as sq, sum(sababsiz_chetel) as sc, sum(sababsiz_boyin) as sboy, sum(sababsiz_ishlab) as si_ish, sum(sababsiz_qarshilik) as sqar, sum(sababsiz_jazo) as sj, sum(sababsiz_nazoratsiz) as sn, sum(sababsiz_boshqa) as sb_ss, sum(sababsiz_turmush) as stur, sum(sababsiz_jami) as ss_jami, sum(total_absent) as t_absent FROM attendance WHERE date = ? GROUP BY district`).all(targetDate);

        let v_schools = 0, v_entries = 0, v_classes = 0, v_students = 0, v_tabsent = 0;
        let v_sababli = Array(5).fill(0), v_sababsiz = Array(11).fill(0);

        allDistricts.forEach((dName, i) => {
            const d = entries.find(e => normalizeKey(e.district) === normalizeKey(dName)) || {};
            const totalSchools = schoolsDb[dName] ? schoolsDb[dName].length : 0;
            const students = d.students || 0;
            const tabsent = d.t_absent || 0;
            const perc = students > 0 ? ((students - tabsent) / students * 100).toFixed(1) : 0;

            const row = sheet1.addRow([
                i + 1, dName, totalSchools, d.entries || 0, d.classes || 0, students, perc + '%', tabsent,
                d.sk || 0, d.st || 0, d.so || 0, d.si || 0, d.sb || 0, d.ss_jami || 0,
                d.sm || 0, d.sq || 0, d.sc || 0, d.sboy || 0, d.si_ish || 0, d.sqar || 0, d.sj || 0, d.sn || 0, d.sb_ss || 0, d.stur || 0
            ]);
            row.eachCell(cell => setStyle(cell));

            v_schools += totalSchools; v_entries += (d.entries || 0); v_classes += (d.classes || 0); v_students += students; v_tabsent += tabsent;
            v_sababli[0] += (d.sk || 0); v_sababli[1] += (d.st || 0); v_sababli[2] += (d.so || 0); v_sababli[3] += (d.si || 0); v_sababli[4] += (d.sb || 0);
            v_sababsiz[0] += (d.ss_jami || 0); v_sababsiz[1] += (d.sm || 0); v_sababsiz[2] += (d.sq || 0); v_sababsiz[3] += (d.sc || 0); v_sababsiz[4] += (d.sboy || 0); v_sababsiz[5] += (d.si_ish || 0); v_sababsiz[6] += (d.sqar || 0); v_sababsiz[7] += (d.sj || 0); v_sababsiz[8] += (d.sn || 0); v_sababsiz[9] += (d.sb_ss || 0); v_sababsiz[10] += (d.stur || 0);
        });

        const totalPerc = v_students > 0 ? ((v_students - v_tabsent) / v_students * 100).toFixed(1) : 0;
        const sumRow = sheet1.addRow(["", "VILOYAT JAMI", v_schools, v_entries, v_classes, v_students, totalPerc + '%', v_tabsent, ...v_sababli, ...v_sababsiz]);
        sumRow.eachCell(cell => setStyle(cell, { bold: true, fill: 'FFFFFF00' }));

        // Add Logo
        const logoPath = path.join(__dirname, '../../assets/logo.png');
        if (fs.existsSync(logoPath)) {
            const logo = workbook.addImage({ filename: logoPath, extension: 'png' });
            sheet1.addImage(logo, { tl: { col: 1, row: sheet1.lastRow.number + 1 }, ext: { width: 120, height: 120 } });
        }

        sheet1.getColumn(1).width = 5; sheet1.getColumn(2).width = 25; for (let c = 3; c <= 24; c++) sheet1.getColumn(c).width = 11;

        // --- SHEET 2: SABABSIZ KELMAGANLAR ---
        const sheet2 = workbook.addWorksheet("Sababsiz O'quvchilar");
        sheet2.columns = [
            { header: '№', key: 'id', width: 5 },
            { header: 'Tuman', key: 'district', width: 25 },
            { header: 'Maktab', key: 'school', width: 20 },
            { header: 'Sinf', key: 'class', width: 10 },
            { header: 'F.I.SH', key: 'name', width: 35 },
            { header: 'Manzil', key: 'address', width: 40 },
            { header: 'Ota-onasi', key: 'parent', width: 25 },
            { header: 'Tel', key: 'phone', width: 15 },
            { header: 'Inspektor', key: 'inspector', width: 25 }
        ];
        sheet2.getRow(1).font = { bold: true };
        sheet2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };

        const absents = db.prepare(`SELECT a.district, a.school, s.class, s.name, s.address, s.parent_name, s.parent_phone, a.inspector FROM absent_students s JOIN attendance a ON s.attendance_id = a.id WHERE a.date = ?`).all(targetDate);
        absents.forEach((r, i) => {
            sheet2.addRow({
                id: i + 1, district: r.district, school: r.school, class: r.class,
                name: r.name, address: r.address, parent: r.parent_name, phone: r.parent_phone, inspector: r.inspector
            });
        });

        const assetsDir = path.resolve(__dirname, '../../assets');
        if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
        const filePath = path.join(assetsDir, `HISOBOT_VILOYAT_${targetDate}.xlsx`);
        await workbook.xlsx.writeFile(filePath); return filePath;
    } catch (e) { console.error("Excel Error:", e); return null; }
}

async function exportDistrictExcel(district, date) {
    try {
        const targetDate = date || getFargonaTime().toISOString().split('T')[0];
        const schoolsDb = require('../database/db').schools_db;
        const normD = normalizeKey(district);
        const dbKey = Object.keys(schoolsDb).find(k => normalizeKey(k) === normD);
        const districtSchools = schoolsDb[dbKey || district] || [];

        const workbook = new ExcelJS.Workbook();
        const sheet1 = workbook.addWorksheet('Tuman Svod');

        sheet1.mergeCells('A1:V1'); sheet1.getCell('A1').value = `${district} maktablari kunlik davomati (Sana: ${targetDate})`;
        sheet1.getCell('A1').font = { bold: true, size: 14 }; sheet1.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
        sheet1.getRow(1).height = 30;

        sheet1.mergeCells('A2:A3'); sheet1.getCell('A2').value = "№";
        sheet1.mergeCells('B2:B3'); sheet1.getCell('B2').value = "Maktab nomi";
        sheet1.mergeCells('C2:C3'); sheet1.getCell('C2').value = "Sinflar";
        sheet1.mergeCells('D2:D3'); sheet1.getCell('D2').value = "O'quvchilar";
        sheet1.mergeCells('E2:E3'); sheet1.getCell('E2').value = "Davomat %";
        sheet1.mergeCells('F2:F3'); sheet1.getCell('F2').value = "Kelmaganlar";
        sheet1.mergeCells('G2:K2'); sheet1.getCell('G2').value = "Sababli";
        ["Kasalligi", "Tadbirlar", "Oilaviy", "Ijtimoiy", "Boshqa"].forEach((v, i) => sheet1.getCell(3, 7 + i).value = v);
        sheet1.mergeCells('L2:L3'); sheet1.getCell('L2').value = "Sababsiz jami";
        sheet1.mergeCells('M2:V2'); sheet1.getCell('M2').value = "Shundan Sababsizlar:";
        ["Muntazam", "Qidiruv", "Chet el", "Bo'yin", "Ish", "Qarshilik", "Jazo", "Nazoratsiz", "Boshqa", "Turmush"].forEach((v, i) => sheet1.getCell(3, 13 + i).value = v);

        for (let r = 2; r <= 3; r++) {
            sheet1.getRow(r).height = 40;
            for (let c = 1; c <= 22; c++) {
                setStyle(sheet1.getCell(r, c), { bold: true, fill: c >= 12 ? 'FFF8CBAD' : 'FFC6E0B4', size: 9 });
            }
        }

        const entries = db.prepare(`SELECT * FROM attendance WHERE date = ?`).all(targetDate);
        const tumanEntries = entries.filter(e => normalizeKey(e.district) === normD);

        let v_cl = 0, v_st = 0, v_tab = 0;
        let v_sab = Array(5).fill(0), v_ss = Array(11).fill(0);

        districtSchools.forEach((sName, i) => {
            const normS = normalizeKey(sName);
            const d = tumanEntries.find(e => normalizeKey(e.school) === normS) || {};
            const st = d.total_students || 0; const tab = d.total_absent || 0; const perc = st > 0 ? ((st - tab) / st * 100).toFixed(1) : 0;

            const row = sheet1.addRow([
                i + 1, sName, d.classes_count || 0, st, perc + '%', tab,
                d.sababli_kasal || 0, d.sababli_tadbirlar || 0, d.sababli_oilaviy || 0, d.sababli_ijtimoiy || 0, d.sababli_boshqa || 0,
                d.sababsiz_jami || 0, d.sababsiz_muntazam || 0, d.sababsiz_qidiruv || 0, d.sababsiz_chetel || 0, d.sababsiz_boyin || 0, d.sababsiz_ishlab || 0, d.sababsiz_qarshilik || 0, d.sababsiz_jazo || 0, d.sababsiz_nazoratsiz || 0, d.sababsiz_boshqa || 0, d.sababsiz_turmush || 0
            ]);
            row.eachCell(c => setStyle(c));

            v_cl += (d.classes_count || 0); v_st += st; v_tab += tab;
            v_sab[0] += (d.sababli_kasal || 0); v_sab[1] += (d.sababli_tadbirlar || 0); v_sab[2] += (d.sababli_oilaviy || 0); v_sab[3] += (d.sababli_ijtimoiy || 0); v_sab[4] += (d.sababli_boshqa || 0);
            v_ss[0] += (d.sababsiz_jami || 0); v_ss[1] += (d.sababsiz_muntazam || 0); v_ss[2] += (d.sababsiz_qidiruv || 0); v_ss[3] += (d.sababsiz_chetel || 0); v_ss[4] += (d.sababsiz_boyin || 0); v_ss[5] += (d.sababsiz_ishlab || 0); v_ss[6] += (d.sababsiz_qarshilik || 0); v_ss[7] += (d.sababsiz_jazo || 0); v_ss[8] += (d.sababsiz_nazoratsiz || 0); v_ss[9] += (d.sababsiz_boshqa || 0); v_ss[10] += (d.sababsiz_turmush || 0);
        });

        const totalPerc = v_st > 0 ? ((v_st - v_tab) / v_st * 100).toFixed(1) : 0;
        const sumRow = sheet1.addRow(["", "TUMAN JAMI", v_cl, v_st, totalPerc + '%', v_tab, ...v_sab, ...v_ss]);
        sumRow.eachCell(c => setStyle(c, { bold: true, fill: 'FFFFFF00' }));

        const logoPath = path.join(__dirname, '../../assets/logo.png');
        if (fs.existsSync(logoPath)) {
            const logo = workbook.addImage({ filename: logoPath, extension: 'png' });
            sheet1.addImage(logo, { tl: { col: 1, row: sheet1.lastRow.number + 1 }, ext: { width: 120, height: 120 } });
        }

        sheet1.getColumn(2).width = 30; for (let c = 3; c <= 22; c++) sheet1.getColumn(c).width = 11;

        const assetsDir = path.resolve(__dirname, '../../assets');
        if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
        const safeDistrict = district.replace(/[^a-zA-Z0-9]/g, '_');
        const filePath = path.join(assetsDir, `HISOBOT_${safeDistrict}_${targetDate}.xlsx`);
        await workbook.xlsx.writeFile(filePath); return filePath;
    } catch (e) { console.error("District Excel Error:", e); return null; }
}

const { normalizeKey } = require('../utils/topics');

async function getViloyatSvod(date) {
    try {
        const topics = require('../config/topics').getTopics();
        const allDistricts = Object.keys(topics).filter(d => d !== "Test rejimi" && d !== "MMT Boshqarma");

        const targetDate = new Date(date);
        const yesterday = new Date(targetDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const entries = db.prepare(`SELECT district, count(school) as entries, sum(total_students) as students, sum(sababli_jami) as sababli, sum(sababsiz_jami) as sababsiz, sum(total_absent) as total_absent, avg(percent) as avg_percent FROM attendance WHERE date = ? GROUP BY district`).all(date);
        const yesterdayEntries = db.prepare(`SELECT district, avg(percent) as avg_percent FROM attendance WHERE date = ? GROUP BY district`).all(yesterdayStr);

        return allDistricts.map(dName => {
            const normD = normalizeKey(dName);
            const entry = entries.find(e => normalizeKey(e.district) === normD);
            const yesterdayEntry = yesterdayEntries.find(e => normalizeKey(e.district) === normD);

            const currentPercent = entry ? (entry.avg_percent || 0) : 0;
            const yesterdayPercent = yesterdayEntry ? (yesterdayEntry.avg_percent || 0) : 0;

            if (entry) return { ...entry, avg_percent: currentPercent, yesterday_percent: yesterdayPercent, district: dName };
            return { district: dName, entries: 0, students: 0, sababli: 0, sababsiz: 0, total_absent: 0, avg_percent: 0, yesterday_percent: yesterdayPercent };
        });
    } catch (e) { console.error("Viloyat Svod Error:", e); return []; }
}

async function getTumanSvod(district, date) {
    try {
        const schoolsDb = require('../database/db').schools_db;
        const normDist = normalizeKey(district);

        const dbKey = Object.keys(schoolsDb).find(k => normalizeKey(k) === normDist);
        const districtSchools = schoolsDb[dbKey || district] || [];

        const entries = db.prepare(`SELECT * FROM attendance WHERE date = ?`).all(date);
        const tumanEntries = entries.filter(e => normalizeKey(e.district) === normDist);

        const clean = s => s ? s.toLowerCase().replace(/[^0-9]/g, '') : '';

        return districtSchools.map(sName => {
            const normS = normalizeKey(sName);
            let entry = tumanEntries.find(e => normalizeKey(e.school) === normS);

            if (!entry) {
                const sNum = clean(sName);
                if (sNum) entry = tumanEntries.find(e => clean(e.school) === sNum);
            }

            if (entry) return entry;

            return {
                district: district, school: sName, time: '-', classes_count: 0, total_students: 0,
                sababli_kasal: 0, sababli_tadbirlar: 0, sababli_oilaviy: 0, sababli_ijtimoiy: 0, sababli_boshqa: 0, sababli_jami: 0,
                sababsiz_muntazam: 0, sababsiz_qidiruv: 0, sababsiz_chetel: 0, sababsiz_boyin: 0, sababsiz_ishlab: 0, sababsiz_qarshilik: 0, sababsiz_jazo: 0, sababsiz_nazoratsiz: 0, sababsiz_boshqa: 0, sababsiz_turmush: 0, sababsiz_jami: 0,
                total_absent: 0, percent: 0, fio: 'Kiritilmagan'
            };
        });
    } catch (e) { console.error("Tuman Svod Error:", e); return []; }
}

async function getTodayAbsentsDetails(date) { try { return db.prepare(`SELECT a.district, a.school, s.class, s.name, s.address, s.parent_name, s.parent_phone FROM absent_students s JOIN attendance a ON s.attendance_id = a.id WHERE a.date = ?`).all(date); } catch (e) { return []; } }

async function getTrendStats(district = null) {
    try {
        let sql = `SELECT date, AVG(percent) as avg_percent FROM attendance `;
        let params = [];
        if (district) {
            sql += ` WHERE district = ? `;
            params.push(district);
        }
        sql += ` GROUP BY date ORDER BY date ASC LIMIT 30`;
        return db.prepare(sql).all(...params);
    } catch (e) { console.error("Trend Stats Error:", e); return []; }
}

async function getRecentActivity(limit = 20, offset = 0) {
    try {
        const rows = db.prepare(`SELECT * FROM attendance ORDER BY id DESC LIMIT ? OFFSET ?`).all(limit, offset);
        const total = db.prepare('SELECT count(*) as count FROM attendance').get().count;
        return { rows, total };
    } catch (e) {
        console.error("Recent Activity Error:", e);
        return { rows: [], total: 0 };
    }
}

module.exports = { saveAttendance, exportToExcel, exportDistrictExcel, getViloyatSvod, getTumanSvod, getTodayAbsentsDetails, getRecentActivity, getTrendStats };

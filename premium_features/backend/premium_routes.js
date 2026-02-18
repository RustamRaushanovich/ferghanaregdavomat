const express = require('express');
const router = express.Router();
const { generateBildirishnoma } = require('../../src/services/pdf');
const db = require('../../src/database/db');
const path = require('path');
const fs = require('fs');
const pg = require('../../src/database/pg');

// Auth middleware for these routes
const auth = (req, res, next) => {
    // This is a simplified auth check, assuming the main app will pass the user object
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
};

const ProAnalytics = require('../../src/services/proAnalytics');

// Check if user is pro
router.get('/check-status', (req, res) => {
    const user = req.user;
    if (!user) return res.json({ is_pro: false });

    // Find user in db by phone or other criteria
    const dbUser = Object.values(db.users_db).find(u => u.phone === user.phone || u.username === user.username);
    const is_pro = (dbUser && new Date(dbUser.pro_expire_date) > new Date()) || (user.role === 'superadmin');

    res.json({
        is_pro,
        expire_date: dbUser ? dbUser.pro_expire_date : null
    });
});

router.get('/red-list', async (req, res) => {
    const user = req.user;
    if (!user.district || !user.school) return res.status(400).json({ error: 'Maktab ma\'lumotlari yetarli emas' });

    const list = await ProAnalytics.getWeeklyRedList(user.district, user.school);
    res.json(list);
});

router.get('/patterns', async (req, res) => {
    const user = req.user;
    if (!user.district || !user.school) return res.status(400).json({ error: 'Maktab ma\'lumotlari yetarli emas' });

    const insights = await ProAnalytics.getAIPatterns(user.district, user.school);
    res.json({ insights });
});

// Get Parent Stats (Based on Subscriptions)
router.get('/parent-stats', (req, res) => {
    const users = db.users_db;
    const stats = {};

    Object.values(users).forEach(u => {
        if (u.role === 'parent' && u.subscriptions) {
            u.subscriptions.forEach(s => {
                if (!stats[s.district]) stats[s.district] = { total: 0, schools: {} };
                stats[s.district].total++;

                if (!stats[s.district].schools[s.school]) stats[s.district].schools[s.school] = 0;
                stats[s.district].schools[s.school]++;
            });
        }
    });

    res.json(stats);
});

// Helper to mask phone numbers for privacy
function maskPhone(phone) {
    if (!phone) return '-';
    const p = phone.replace(/\D/g, '');
    if (p.length < 9) return phone;
    // Format: +998 ** *** 23 23
    return `+998 ** *** ${p.slice(-4, -2)} ${p.slice(-2)}`;
}

// Get Registered Parents List with STRICT Privacy Controls
router.get('/parents', async (req, res) => {
    const user = req.user;
    const users = db.users_db;
    const districtFilter = req.query.district;
    const schoolFilter = req.query.school;

    const list = [];

    Object.values(users).forEach(u => {
        if (u.role === 'parent' && u.subscriptions) {
            u.subscriptions.forEach(s => {
                // Apply filters
                if (districtFilter && s.district !== districtFilter) return;
                if (schoolFilter && s.school !== schoolFilter) return;

                // STRICT: ONLY superadmin can see full data
                const isSuperAdmin = (user.role === 'superadmin');

                list.push({
                    parent_fio: u.fio,
                    child_name: s.name || 'Noma\'lum',
                    phone: isSuperAdmin ? (u.phone.startsWith('+') ? u.phone : '+' + u.phone) : maskPhone(u.phone),
                    district: s.district,
                    school: s.school,
                    registered_at: s.added_at || u.registered_at,
                    is_masked: !isSuperAdmin
                });
            });
        }
    });

    // Audit Logging & Intrusion Detection
    try {
        await pg.query('INSERT INTO audit_logs (user_id, action, details, timestamp) VALUES ($1, $2, $3, $4)',
            [user.username || user.id, 'SECURE_VIEW_PARENTS', `Dist: ${districtFilter || 'All'}, Admin_Role: ${user.role}`, new Date().toISOString()]);

        // If a non-superadmin tries to access a large list, alert!
        if (user.role !== 'superadmin' && list.length > 50) {
            console.warn(`🚨 SECURITY ALERT: Admin "${user.username}" accessed ${list.length} records!`);
            // You can add a telegram alert here later
        }
    } catch (e) { console.error("Audit log error:", e); }

    res.json(list);
});


// Generate Bildirishnoma (Pro only)
router.post('/generate-notice', async (req, res) => {
    const user = req.user;

    // Pro check
    const dbUser = Object.values(db.users_db).find(u => u.username === user.username);
    const is_pro = dbUser && new Date(dbUser.pro_expire_date) > new Date();

    if (!is_pro) {
        return res.status(403).json({ error: 'Bu funksiya faqat PRO foydalanuvchilar uchun.' });
    }

    try {
        const { district, school, students, inspector, fio } = req.body;
        const pdfPath = await generateBildirishnoma({
            district: district || user.district,
            school: school || user.school,
            students: students || [],
            inspector: inspector || '',
            fio: fio || user.fio
        });

        if (fs.existsSync(pdfPath)) {
            res.download(pdfPath, (err) => {
                if (!err) {
                    // Delete temp file after download
                    setTimeout(() => fs.unlinkSync(pdfPath), 5000);
                }
            });
        } else {
            res.status(500).json({ error: 'Fayl yaratishda xatolik' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get Weekly Leaderboard (Ranking)
router.get('/leaderboard', async (req, res) => {
    try {
        const now = new Date();
        const dateRange = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            dateRange.push(d.toISOString().split('T')[0]);
        }

        // Viloyat Top 10
        const vQ = `
            SELECT district, school, AVG(percent) as avg_p 
            FROM attendance 
            WHERE date = ANY($1) 
            GROUP BY district, school 
            HAVING AVG(percent) > 0
            ORDER BY avg_p DESC LIMIT 10
        `;
        const vRes = await pg.query(vQ, [dateRange]);

        // District Best (One from each)
        const dQ = `
            SELECT DISTINCT ON (district) district, school, AVG(percent) as avg_p
            FROM attendance
            WHERE date = ANY($1)
            GROUP BY district, school
            ORDER BY district, avg_p DESC
        `;
        const dRes = await pg.query(dQ, [dateRange]);

        res.json({
            viloyat: vRes.rows,
            districts: dRes.rows.sort((a, b) => b.avg_p - a.avg_p)
        });
    } catch (e) {
        console.error("Leaderboard API Error:", e);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

module.exports = router;

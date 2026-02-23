const db = require('../database/pg');
const { getFargonaTime } = require('../utils/fargona');

const ProAnalytics = {
    /**
     * "Qizil ro'yxat" - Weekly frequent absentees
     * Students who missed school 2 or more times (sababsiz) in the last 7 days.
     */
    async getWeeklyRedList(district, school) {
        try {
            const sql = `
                SELECT s.name, s.class, COUNT(s.id) as absent_count, s.parent_phone
                FROM absent_students s
                JOIN attendance a ON s.attendance_id = a.id
                WHERE a.district = $1 AND a.school = $2
                AND a.date >= (CURRENT_DATE - INTERVAL '7 days')
                GROUP BY s.name, s.class, s.parent_phone
                HAVING COUNT(s.id) >= 2
                ORDER BY absent_count DESC
            `;
            const res = await db.query(sql, [district, school]);
            return res.rows;
        } catch (e) {
            console.error("Weekly Red List Error:", e.message);
            return [];
        }
    },

    /**
     * Monthly Dynamics for the bot
     * Returns a 30-day attendance trend as text/emojis
     */
    async getMonthlyDynamics(district, school) {
        try {
            const sql = `
                SELECT date, percent
                FROM attendance
                WHERE district = $1 AND school = $2
                AND date >= (CURRENT_DATE - INTERVAL '30 days')
                ORDER BY date ASC
            `;
            const res = await db.query(sql, [district, school]);

            if (res.rows.length === 0) return "Tahlil uchun ma'lumot yetarli emas.";

            let report = `📊 <b>Oxirgi 30 kunlik tahlil (${school}):</b>\n\n`;
            let chart = "";
            let avg = 0;

            res.rows.forEach(r => {
                const d = new Date(r.date);
                const dateShort = `${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`; // MM.DD
                const p = parseFloat(r.percent);
                avg += p;

                // Simple emoji chart
                let bar = "🟥";
                if (p >= 95) bar = "🟩";
                else if (p >= 90) bar = "🟨";
                else if (p >= 85) bar = "🟧";

                chart += `📅 ${dateShort}: ${bar} <b>${p}%</b>\n`;
            });

            avg = (avg / res.rows.length).toFixed(1);
            report += chart;
            report += `\n📈 <b>O'rtacha davomat: ${avg}%</b>`;

            return report;
        } catch (e) {
            console.error("Monthly Dynamics Error:", e.message);
            return "Xatolik yuz berdi.";
        }
    },

    /**
     * AI Pattern Recognition
     * Identifies if a student misses specific days consistently
     */
    async getAIPatterns(district, school) {
        try {
            const sql = `
                SELECT s.name, s.class, a.date
                FROM absent_students s
                JOIN attendance a ON s.attendance_id = a.id
                WHERE a.district = $1 AND a.school = $2
                AND a.date >= (CURRENT_DATE - INTERVAL '60 days')
            `;
            const res = await db.query(sql, [district, school]);

            if (res.rows.length === 0) return null;

            const studentAbsents = {};
            res.rows.forEach(r => {
                const key = `${r.name} (${r.class}-sinf)`;
                const day = new Date(r.date).getDay(); // 0-6
                if (!studentAbsents[key]) studentAbsents[key] = [];
                studentAbsents[key].push(day);
            });

            const dayNames = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
            let insights = [];

            for (const [student, days] of Object.entries(studentAbsents)) {
                if (days.length < 3) continue;

                // Count occurrences of each day
                const counts = {};
                days.forEach(d => counts[d] = (counts[d] || 0) + 1);

                for (const [dayStr, count] of Object.entries(counts)) {
                    if (count >= 3) {
                        const dayIndex = parseInt(dayStr, 10);
                        insights.push(`⚠️ <b>${student}</b> oxirgi vaqtlarda asosan <b>${dayNames[dayIndex]}</b> kunlari dars qoldirgan (${count} marta). Bunga e'tibor qaratish kerak.`);
                    }
                }
            }

            return insights.length > 0 ? insights.join('\n\n') : "Hozircha shubhali takroriy holatlar aniqlanmadi.";
        } catch (e) {
            console.error("AI Pattern Error:", e.message);
            return "AI tahlilida xatolik.";
        }
    }
};

module.exports = ProAnalytics;

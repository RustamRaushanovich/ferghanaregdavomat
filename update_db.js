const pg = require('./src/database/pg');
setTimeout(async () => {
  try {
    await pg.query("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2026-2027';");
    console.log("Column added");
    
    const sRes = await pg.query("SELECT value FROM settings WHERE key = 'global'");
    let settings = sRes.rows.length > 0 ? sRes.rows[0].value : {};
    settings.vacation_mode = false;
    settings.academic_year = '2026-2027';
    await pg.query("INSERT INTO settings (key, value) VALUES ('global', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [settings]);
    console.log("Settings updated");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}, 2000);

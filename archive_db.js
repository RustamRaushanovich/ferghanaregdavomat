const pg = require('./src/database/pg');

async function archiveDb() {
  try {
    console.log("Archiving attendance (2025-2026)...");
    await pg.query("CREATE TABLE IF NOT EXISTS attendance_2025_2026 AS SELECT * FROM attendance;");
    await pg.query("TRUNCATE TABLE attendance;");
    console.log("Archived attendance.");

    console.log("Archiving absent_students (2025-2026)...");
    await pg.query("CREATE TABLE IF NOT EXISTS absent_students_2025_2026 AS SELECT * FROM absent_students;");
    await pg.query("TRUNCATE TABLE absent_students;");
    console.log("Archived absent_students.");

    console.log("Archive complete. Clean state ready for 2026-2027.");
  } catch (err) {
    console.error("Error archiving:", err);
  } finally {
    process.exit(0);
  }
}

archiveDb();

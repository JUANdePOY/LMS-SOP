const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  try {
    const [verRows] = await pool.query("SELECT * FROM sop_versions WHERE sop_id = ?", [35]);
    console.log("sop_versions for SOP 35:", verRows.length);
    verRows.forEach((v) => console.log(` - Version ${v.id}: ${v.version}, is_current=${v.is_current}, status=${v.status}`));

    const [mods] = await pool.query("SELECT id, title, sop_version_id FROM sop_modules WHERE sop_id = ?", [35]);
    console.log("\nsop_modules for SOP 35:");
    mods.forEach((m) => console.log(` - Module ${m.id}: ${m.title}, sop_version_id=${m.sop_version_id}`));

    const [verCols] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sop_versions' ORDER BY ORDINAL_POSITION"
    );
    console.log("\nsop_versions columns:");
    verCols.forEach((c) => console.log(" -", c.COLUMN_NAME));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();

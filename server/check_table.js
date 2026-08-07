const mysql = require("mysql2/promise");
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: "127.0.0.1",
      user: "root",
      password: "",
      database: "u607968802_lms_sop"
    });
    const [tables] = await conn.query("SHOW TABLES LIKE 'certificate_course_links'");
    console.log("Table exists:", tables.length > 0);
    if (tables.length > 0) {
      const [cols] = await conn.query("DESCRIBE certificate_course_links");
      console.log("Columns:", cols.map(c => c.Field).join(", "));
    }
    await conn.end();
  } catch (e) {
    console.error("DB error:", e.message);
  }
})();

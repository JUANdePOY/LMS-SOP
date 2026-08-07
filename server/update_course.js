const mysql = require("mysql2/promise");
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: "127.0.0.1",
      user: "root",
      password: "",
      database: "u607968802_lms_sop"
    });
    await conn.query("UPDATE courses SET send_completion_certificates = 1 WHERE id = 25");
    const [rows] = await conn.query("SELECT id, title, send_completion_certificates FROM courses WHERE id = 25");
    console.log("Updated course:", rows[0]);
    await conn.end();
  } catch (e) {
    console.error("DB error:", e.message);
  }
})();

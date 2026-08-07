const mysql = require("mysql2/promise");
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: "127.0.0.1",
      user: "root",
      password: "",
      database: "u607968802_lms_sop"
    });
    const [rows] = await conn.query("SELECT id, certificate_number, verification_code, resolved_sections, data_snapshot FROM certificate_issuances WHERE user_id = 4 AND status = 'active' LIMIT 3");
    rows.forEach(r => {
      console.log("ID:", r.id);
      console.log("certificate_number:", r.certificate_number);
      console.log("verification_code:", r.verification_code);
      const resolved = typeof r.resolved_sections === 'string' ? JSON.parse(r.resolved_sections) : r.resolved_sections;
      console.log("recipient_name.text:", resolved?.recipient_name?.text);
      console.log("date.text:", resolved?.date?.text);
      console.log("---");
    });
    await conn.end();
  } catch (e) {
    console.error("DB error:", e.message);
  }
})();

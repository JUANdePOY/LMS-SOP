require('dotenv').config();
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
  });
  const [u] = await conn.query("SELECT id FROM users WHERE id = 1 LIMIT 1");
  await conn.end();
  const tok = jwt.sign({ userId: u[0].id }, process.env.JWT_SECRET || 'your-secret-key-change-in-production', { expiresIn: '1h' });
  console.log('TOKEN=' + tok);
})().catch(e => { console.error(e.message); process.exit(1); });

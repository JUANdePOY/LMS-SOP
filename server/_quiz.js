require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
  });
  const [quizzes] = await conn.query("SELECT id, title FROM quizzes WHERE status='published' LIMIT 1");
  await conn.end();
  console.log('QUIZ=' + JSON.stringify(quizzes[0]));
})().catch(e => { console.error(e.message); process.exit(1); });

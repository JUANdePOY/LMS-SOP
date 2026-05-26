const mysql = require('mysql2');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pafr',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Health-check probe (callback API, fires once at startup)
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Database connected successfully');
  connection.release();
});

// Promise-based wrapper — every method on connections obtained from
// getConnection() (query, execute, beginTransaction, commit, rollback,
// release) is fully Promise-returning.
const db = pool.promise();

// Override getConnection so callers never touch the raw callback API.
// pool.promise().getConnection() resolves to a PromiseConnection where
// .query(), .execute(), .beginTransaction(), .commit() and .rollback()
// all return proper Promises — no hand-rolling needed.
db.getConnection = () => pool.promise().getConnection();

// Expose the raw pool explicitly (e.g. for .promise() chaining if needed)
db.rawPool = pool;

module.exports = db;
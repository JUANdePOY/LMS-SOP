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

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Database connected successfully');
  connection.release();
});

// Export the promise-based pool for async/await support
const db = pool.promise();

// Add getConnection method for transactions - returns connection with promise-based execute
db.getConnection = function() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);
      // Convert connection to promise-based
      const oldExecute = connection.execute.bind(connection);
      connection.execute = (...args) => {
        return new Promise((resolve, reject) => {
          oldExecute(...args, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
      };
      resolve(connection);
    });
  });
};

module.exports = db;
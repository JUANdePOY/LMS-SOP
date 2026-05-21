const mysql = require('mysql2');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pafr',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Database connected successfully');
  connection.release();
});

const db = pool.promise();

db.getConnection = function getConnection() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);

      const makePromiseMethod = (method) => {
        const originalMethod = connection[method].bind(connection);
        connection[method] = (...args) => {
          return new Promise((res, rej) => {
            originalMethod(...args, (err2, results, fields) => {
              if (err2) rej(err2);
              else res([results, fields]);
            });
          });
        };
      };

      makePromiseMethod('execute');
      makePromiseMethod('query');
      resolve(connection);
    });
  });
};

module.exports = db;

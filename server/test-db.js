const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pafr'
});

console.log('Testing database connection...');
console.log(`Connecting to: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`);

db.connect((err) => {
    if (err) {
        console.error(' Connection failed:', err.message);
        process.exit(1);
    }
    console.log(' Database connected successfully!');
    
    // Test query
    db.query('SELECT COUNT(*) as count FROM users', (err, results) => {
        if (err) {
            console.error(' Query failed:', err.message);
            db.end();
            process.exit(1);
        }
        console.log(' Test query successful!');
        console.log(`   User count: ${results[0].count}`);
        
        // Get tables
        db.query('SHOW TABLES', (err, tables) => {
            if (err) {
                console.error(' Show tables failed:', err.message);
            } else {
                console.log(`   Tables found: ${tables.length}`);
                tables.forEach(table => {
                    const tableName = Object.values(table)[0];
                    console.log(`     - ${tableName}`);
                });
            }
            db.end();
            process.exit(0);
        });
    });
});

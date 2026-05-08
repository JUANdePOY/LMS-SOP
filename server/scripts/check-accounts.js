/**
 * Check Development Accounts Script
 */

const db = require('../config/database');

const serviceNumbers = ['ADMIN-001', 'RES-001'];

console.log('Checking development accounts...\n');

serviceNumbers.forEach(sn => {
  db.query(
    `SELECT u.id, u.email, u.role, r.service_number, r.first_name, r.last_name 
     FROM users u 
     LEFT JOIN reservists r ON u.id = r.user_id 
     WHERE u.email = ?`,
    [sn],
    (err, results) => {
      if (err) {
        console.error(`Error checking ${sn}:`, err.message);
        return;
      }

      if (results && results.length > 0) {
        const user = results[0];
        console.log(`Found: ${sn}`);
        console.log(`  User ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Service Number: ${user.service_number || 'MISSING'}`);
        console.log(`  Name: ${user.first_name || 'N/A'} ${user.last_name || ''}\n`);
      } else {
        console.log(`Not found: ${sn}\n`);
      }
    }
  );
});

setTimeout(() => process.exit(0), 2000);

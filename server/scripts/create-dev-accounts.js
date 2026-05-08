/**
 * Create Development Accounts Script
 * Creates admin and reservist test accounts for development purposes
 * 
 * Usage: node server/scripts/create-dev-accounts.js
 */

const bcrypt = require('bcrypt');
const db = require('../config/database');

const SALT_ROUNDS = 10;

// Development accounts to create
const accounts = [
  {
    id_number: 'ADMIN-001',
    password: 'AdminPass123!',
    role: 'admin',
    first_name: 'System',
    last_name: 'Administrator',
    rank: 'Captain',
    service_number: 'ADMIN-001'
  },
  {
    id_number: 'RES-001',
    password: 'Reservist123!',
    role: 'reservist',
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    rank: 'Airman',
    service_number: 'RES-001'
  }
];

// Promisify db.query for async/await support
function query(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

async function createAccounts() {
  console.log('Creating development accounts...\n');

  for (const account of accounts) {
    try {
      // Check if user already exists in reservists table
      const existing = await query(
        'SELECT r.id, u.id as user_id FROM reservists r JOIN users u ON r.user_id = u.id WHERE r.service_number = ?',
        [account.service_number]
      );

      if (existing && existing.length > 0) {
        console.log(`Account ${account.id_number} already exists. Skipping...`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(account.password, SALT_ROUNDS);
      console.log(`Creating account: ${account.id_number}`);

      // Insert into users table
      const userResult = await query(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [account.service_number, passwordHash, account.role]
      );

      const userId = userResult.insertId;
      console.log(`  Created user with ID: ${userId}`);

      // Insert into reservists table
      await query(
        'INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, account.first_name, account.last_name, account.rank, account.service_number, true]
      );

      console.log(`  Created reservist profile: ${account.first_name} ${account.last_name}`);
      console.log(`  ID Number: ${account.service_number}, Role: ${account.role}\n`);

    } catch (error) {
      console.error(`Error creating account ${account.id_number}:`, error.message);
    }
  }

  console.log('Development accounts creation completed.');
  process.exit(0);
}

// Run the script
createAccounts();

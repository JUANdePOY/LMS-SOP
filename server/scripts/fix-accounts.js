/**
 * Fix Development Accounts - Add Missing Reservist Records
 */

const db = require('../config/database');

// Promisify db.query
function query(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

async function fixAccounts() {
  console.log('Fixing development accounts - adding missing reservist records...\n');

  const accounts = [
    {
      user_id: 5,
      first_name: 'System',
      last_name: 'Administrator',
      rank: 'Captain',
      service_number: 'ADMIN-001'
    },
    {
      user_id: 6,
      first_name: 'Juan',
      last_name: 'Dela Cruz',
      rank: 'Airman',
      service_number: 'RES-001'
    }
  ];

  for (const account of accounts) {
    try {
      // Check if reservist record already exists
      const existing = await query(
        'SELECT id FROM reservists WHERE user_id = ?',
        [account.user_id]
      );

      if (existing && existing.length > 0) {
        console.log(`Reservist record already exists for user ${account.user_id}. Skipping...`);
        continue;
      }

      // Insert reservist record
      await query(
        'INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [account.user_id, account.first_name, account.last_name, account.rank, account.service_number, true]
      );

      console.log(`Created reservist record for ${account.service_number} (user_id: ${account.user_id})`);
    } catch (error) {
      console.error(`Error fixing account for user ${account.user_id}:`, error.message);
    }
  }

  console.log('\nFix completed.');
  process.exit(0);
}

fixAccounts();

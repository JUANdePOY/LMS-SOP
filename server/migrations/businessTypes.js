const db = require('../config/database');

const BUSINESS_TYPE_MIGRATIONS = [
  `ALTER TABLE client_businesses
    ADD COLUMN IF NOT EXISTS status ENUM('active','inactive','paused','stopped','cancelled','archived') NOT NULL DEFAULT 'active'
    AFTER business_name`,
  `ALTER TABLE client_businesses
    MODIFY COLUMN status ENUM('active','inactive','paused','stopped','cancelled','archived') NOT NULL DEFAULT 'active'`,
  `ALTER TABLE client_businesses
    ADD COLUMN IF NOT EXISTS business_type ENUM('orders','va_clients','local_seo_clients','full_seo_clients') DEFAULT NULL
    AFTER status`,
  `ALTER TABLE client_businesses
    ADD COLUMN IF NOT EXISTS category ENUM('local_seo','full_seo','none') NOT NULL DEFAULT 'none'
    AFTER business_type`,
  `ALTER TABLE client_businesses
    ADD INDEX IF NOT EXISTS idx_client_businesses_type (business_type)`,
  `ALTER TABLE client_businesses
    ADD INDEX IF NOT EXISTS idx_client_businesses_category (category)`,
];

async function runBusinessTypeMigrations() {
  for (const sql of BUSINESS_TYPE_MIGRATIONS) {
    if (!sql || !sql.trim()) continue;
    try {
      await db.query(sql);
    } catch (err) {
      const ignoreCodes = ['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 1060, 1061, 121];
      if (
        ignoreCodes.includes(err.code) ||
        ignoreCodes.includes(err.errno) ||
        /Duplicate field name|Duplicate key name/.test(err.message)
      ) {
        console.log('Business type migration skipped (already exists):', sql.split('\n')[0]);
      } else {
        console.error('Business type migration error:', err.message);
        console.error('Offending SQL:', sql);
      }
    }
  }
  console.log('Business type migrations applied');
}

module.exports = { runBusinessTypeMigrations };

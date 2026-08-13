const db = require('../config/database');

const NOTIFICATIONS_MIGRATIONS = [
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100) DEFAULT NULL AFTER link`,
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id INT DEFAULT NULL AFTER entity_type`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id)`,
];

async function runNotificationMigrations() {
  for (const sql of NOTIFICATIONS_MIGRATIONS) {
    if (!sql || !sql.trim()) continue;
    try {
      await db.query(sql);
    } catch (err) {
      const ignoreCodes = ['ER_DUP_COLUMN', 'ER_DUP_KEYNAME', 1060, 1050, 1061, 1068, 1091];
      if (ignoreCodes.includes(err.code) || ignoreCodes.includes(err.errno)) {
        continue;
      }
      console.error('Notification migration error:', err.message);
    }
  }
  console.log('Notification migrations applied');
}

module.exports = { runNotificationMigrations };

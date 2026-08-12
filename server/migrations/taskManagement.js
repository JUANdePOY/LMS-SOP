const db = require('../config/database');

const TASK_MANAGEMENT_MIGRATIONS = [
  `ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS parent_id INT DEFAULT NULL AFTER user_id`,
  `ALTER TABLE task_comments ADD CONSTRAINT fk_task_comments_parent FOREIGN KEY (parent_id) REFERENCES task_comments(id) ON DELETE CASCADE`,
  `CREATE INDEX IF NOT EXISTS idx_task_comments_parent ON task_comments(parent_id)`,
];

async function runTaskMigrations() {
  for (const sql of TASK_MANAGEMENT_MIGRATIONS) {
    if (!sql || !sql.trim()) continue;
    try {
      await db.query(sql);
    } catch (err) {
      const ignoreCodes = ['ER_DUP_COLUMN', 'ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME', 1060, 1050, 1061, 121];
      if (
        ignoreCodes.includes(err.code) ||
        ignoreCodes.includes(err.errno) ||
        /errno: 121|Duplicate key on write or update/.test(err.message)
      ) {
        console.log('Task management migration skipped (already exists):', sql.split('\n')[0]);
      } else {
        console.error('Task management migration error:', err.message);
        console.error('Offending SQL:', sql);
      }
    }
  }
  console.log('Task management migrations applied');
}

module.exports = { runTaskMigrations };

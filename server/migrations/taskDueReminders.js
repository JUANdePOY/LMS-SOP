const db = require('../config/database');

// Tracks which due-date reminders have already been sent for a task, so the
// scheduler can fire each reminder exactly once instead of re-notifying every
// scan cycle. The 3d/2d/1d flags are scoped to employees + department heads;
// the overdue flag covers employees, department heads, and admins.
const MIGRATIONS = [
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_3d_sent TINYINT NOT NULL DEFAULT 0 AFTER deadline_datetime`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_2d_sent TINYINT NOT NULL DEFAULT 0 AFTER deadline_datetime`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_1d_sent TINYINT NOT NULL DEFAULT 0 AFTER deadline_datetime`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_overdue_sent TINYINT NOT NULL DEFAULT 0 AFTER deadline_datetime`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_due_reminders ON tasks (deadline_datetime, reminder_overdue_sent)`,
];

async function runTaskDueReminderMigrations() {
  for (const sql of MIGRATIONS) {
    if (!sql || !sql.trim()) continue;
    try {
      await db.query(sql);
    } catch (err) {
      const ignoreCodes = [
        'ER_DUP_COLUMN', 'ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME',
        'ER_DUP_ENTRY', 1060, 1050, 1061, 121,
      ];
      if (
        ignoreCodes.includes(err.code) ||
        ignoreCodes.includes(err.errno) ||
        /errno: 121|Duplicate key on write or update|Duplicate entry/.test(err.message)
      ) {
        console.log('Task due-reminder migration skipped (already exists):', sql.split('\n')[0]);
        continue;
      }
      console.error('Task due-reminder migration error:', err.message);
      console.error('Offending SQL:', sql);
    }
  }
  console.log('Task due-reminder migrations applied');
}

module.exports = { runTaskDueReminderMigrations };
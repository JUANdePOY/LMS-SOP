const db = require('../config/database');

const TASK_MANAGEMENT_MIGRATIONS = [
  `ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS parent_id INT DEFAULT NULL AFTER user_id`,
  `ALTER TABLE task_comments ADD CONSTRAINT fk_task_comments_parent FOREIGN KEY (parent_id) REFERENCES task_comments(id) ON DELETE CASCADE`,
  `CREATE INDEX IF NOT EXISTS idx_task_comments_parent ON task_comments(parent_id)`,

  // Rich comments: store @mentions and allow attachments inside a comment.
  `ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS mentions JSON DEFAULT NULL AFTER comment`,
  `ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS comment_id INT DEFAULT NULL AFTER task_progress_id`,
  `ALTER TABLE task_attachments ADD CONSTRAINT fk_task_attachments_comment FOREIGN KEY (comment_id) REFERENCES task_comments(id) ON DELETE CASCADE`,
  // Allow tasks to be created without a status, priority, or dates so the new
  // task can be configured afterwards (the hierarchy quick-add leaves them empty).
  `ALTER TABLE tasks MODIFY COLUMN priority ENUM('Low','Medium','High','Critical') NULL DEFAULT 'Medium'`,
  `ALTER TABLE tasks MODIFY COLUMN status ENUM('Pending','In Progress','Completed','Overdue','Cancelled') NULL DEFAULT 'Pending'`,
  `ALTER TABLE tasks MODIFY COLUMN start_datetime DATETIME NULL`,
  `ALTER TABLE tasks MODIFY COLUMN deadline_datetime DATETIME NULL`,
  // Progress notes: the task_progress.notes column is part of the base table
  // definition (database.js), but an older table may predate it. CREATE TABLE
  // IF NOT EXISTS never adds a missing column to an existing table, so without
  // this migration notes typed in "Update Progress" are silently dropped and the
  // progress history renders nothing for them.
  `ALTER TABLE task_progress ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL AFTER status`,

  // Business managers: a user granted management access to a SOP business
  // (client_businesses) can manage every task in that business. Distinct from
  // per-task assignments so the grant is one row per (business, user) rather
  // than one assignment per task.
  `CREATE TABLE IF NOT EXISTS business_managers (
     id INT AUTO_INCREMENT PRIMARY KEY,
     business_id INT NOT NULL,
     user_id INT NOT NULL,
     granted_by INT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY uq_business_manager (business_id, user_id),
     INDEX idx_business_managers_business (business_id),
     INDEX idx_business_managers_user (user_id),
     CONSTRAINT fk_business_managers_business FOREIGN KEY (business_id) REFERENCES client_businesses(id) ON DELETE CASCADE,
     CONSTRAINT fk_business_managers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   )`,
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

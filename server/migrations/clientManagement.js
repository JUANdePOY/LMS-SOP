const db = require('../config/database');

const CLIENT_MANAGEMENT_MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    created_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_clients_name (client_name),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_clients_name (client_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS client_businesses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    UNIQUE KEY uk_client_business (client_id, business_name),
    INDEX idx_client_businesses_client (client_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `ALTER TABLE tasks ADD COLUMN parent_task_id INT DEFAULT NULL`,
  `ALTER TABLE tasks ADD COLUMN client_id INT DEFAULT NULL`,
  `ALTER TABLE tasks ADD COLUMN client_business_id INT DEFAULT NULL`,
  `ALTER TABLE tasks ADD COLUMN business_id INT DEFAULT NULL`,

  `ALTER TABLE tasks ADD CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE`,
  `ALTER TABLE tasks ADD CONSTRAINT fk_tasks_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL`,
  `ALTER TABLE tasks ADD CONSTRAINT fk_tasks_client_business FOREIGN KEY (client_business_id) REFERENCES client_businesses(id) ON DELETE SET NULL`,
  `ALTER TABLE tasks ADD CONSTRAINT fk_tasks_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL`,

  `ALTER TABLE tasks ADD INDEX idx_tasks_parent (parent_task_id)`,
  `ALTER TABLE tasks ADD INDEX idx_tasks_client (client_id)`,
  `ALTER TABLE tasks ADD INDEX idx_tasks_business (business_id)`,

  // Link each client to a SOP business (top-level `businesses` table) so the
  // secondary panel can group clients under their SOP business. Nullable + SET
  // NULL so removing a SOP business does not cascade-delete its clients.
  `ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_id INT DEFAULT NULL`,
  `ALTER TABLE clients ADD CONSTRAINT fk_clients_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL`,
  `ALTER TABLE clients ADD INDEX IF NOT EXISTS idx_clients_business (business_id)`,

   // Per-client accent color shown as a dot before the name in the task
   // hierarchy table. Nullable; falls back to the brand accent when unset.
   `ALTER TABLE clients ADD COLUMN color VARCHAR(32) DEFAULT NULL`,

   // Optional department link so a client can be scoped to a specific
   // department within the SOP business. Nullable + SET NULL so removing a
   // department does not cascade-delete its clients.
   `ALTER TABLE clients ADD COLUMN IF NOT EXISTS department_id INT DEFAULT NULL`,
   `ALTER TABLE clients ADD CONSTRAINT fk_clients_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL`,
   `ALTER TABLE clients ADD INDEX IF NOT EXISTS idx_clients_department (department_id)`,
];

async function runClientMigrations() {
  for (const sql of CLIENT_MANAGEMENT_MIGRATIONS) {
    if (!sql || !sql.trim()) continue;
    try {
      await db.query(sql);
    } catch (err) {
      const ignoreCodes = ['ER_DUP_COLUMN', 'ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME', 'ER_DUP_ENTRY', 1060, 1050, 1061, 121];
      if (
        ignoreCodes.includes(err.code) ||
        ignoreCodes.includes(err.errno) ||
        /errno: 121|Duplicate key on write or update|Duplicate entry/.test(err.message)
      ) {
        console.log('Client management migration skipped (already exists):', sql.split('\n')[0]);
      } else {
        console.error('Client management migration error:', err.message);
        console.error('Offending SQL:', sql);
      }
    }
  }
  console.log('Client management migrations applied');
}

module.exports = { runClientMigrations };

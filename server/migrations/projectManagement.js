const db = require('../config/database');

const PROJECT_MANAGEMENT_MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_business_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('planning','active','on_hold','completed','cancelled') NOT NULL DEFAULT 'planning',
    start_date DATE,
    due_date DATE,
    color VARCHAR(32) DEFAULT '#C14E08',
    enabled_views TEXT,
    created_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_business_id) REFERENCES client_businesses(id) ON DELETE CASCADE,
    UNIQUE KEY uk_project_business_name (client_business_id, name),
    INDEX idx_projects_business (client_business_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `ALTER TABLE tasks ADD COLUMN project_id INT DEFAULT NULL`,
  `ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL`,
  `ALTER TABLE tasks ADD INDEX idx_tasks_project (project_id)`,

  `CREATE TABLE IF NOT EXISTS task_custom_field_definitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('text','number','select','multiselect','date','user') NOT NULL DEFAULT 'text',
    options TEXT,
    position INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY uk_field_project_name (project_id, name),
    INDEX idx_field_project (project_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS task_custom_field_values (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    field_id INT NOT NULL,
    value TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES task_custom_field_definitions(id) ON DELETE CASCADE,
    UNIQUE KEY uk_task_field (task_id, field_id),
    INDEX idx_cfv_task (task_id),
    INDEX idx_cfv_field (field_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function runProjectMigrations() {
  for (const sql of PROJECT_MANAGEMENT_MIGRATIONS) {
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
        console.log('Project management migration skipped (already exists):', sql.split('\n')[0]);
      } else {
        console.error('Project management migration error:', err.message);
        console.error('Offending SQL:', sql);
      }
    }
  }
  console.log('Project management migrations applied');
}

module.exports = { runProjectMigrations };

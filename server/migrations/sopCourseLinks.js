const db = require('../config/database');

const SOP_COURSE_LINK_MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS sop_course_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_id INT NOT NULL,
    course_id INT NULL,
    module_id INT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_required TINYINT(1) NOT NULL DEFAULT 0,
    link_type ENUM('Prerequisite','Reference','Companion') NOT NULL DEFAULT 'Reference',
    created_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_sop_course_links_course (course_id),
    INDEX idx_sop_course_links_sop (sop_id),
    INDEX idx_sop_course_links_module (module_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function runSopCourseLinkMigrations() {
  const pool = db.getPool ? db.getPool() : db;
  
  // Run base table creation
  for (const sql of SOP_COURSE_LINK_MIGRATIONS) {
    if (!sql || !sql.trim()) continue;
    try {
      await pool.query(sql);
    } catch (err) {
      const ignoreCodes = ['ER_TABLE_EXISTS_ERROR', 1050];
      if (ignoreCodes.includes(err.code) || ignoreCodes.includes(err.errno)) {
        console.log('SOP course link migration skipped (table exists):', sql.split('\n')[0]);
      } else {
        console.error('SOP course link migration error:', err.message);
        console.error('Offending SQL:', sql);
      }
    }
  }

  // Add missing columns individually (MySQL doesn't support IF NOT EXISTS for ADD COLUMN)
  const columnMigrations = [
    { column: 'module_id', definition: 'ADD COLUMN module_id INT NULL AFTER course_id' },
    { column: 'display_order', definition: 'ADD COLUMN display_order INT NOT NULL DEFAULT 0 AFTER module_id' },
    { column: 'is_required', definition: 'ADD COLUMN is_required TINYINT(1) NOT NULL DEFAULT 0 AFTER display_order' },
  ];

  for (const col of columnMigrations) {
    try {
      await pool.query(`ALTER TABLE sop_course_links ${col.definition}`);
      console.log(`SOP course link column added: ${col.column}`);
    } catch (err) {
      const ignoreCodes = ['ER_DUP_FIELDNAME', 1060];
      if (ignoreCodes.includes(err.code) || ignoreCodes.includes(err.errno)) {
        console.log(`SOP course link column already exists: ${col.column}`);
      } else {
        console.error(`SOP course link column migration error (${col.column}):`, err.message);
      }
    }
  }

  // Add indexes individually
  const indexMigrations = [
    { name: 'idx_sop_course_links_course', definition: 'INDEX idx_sop_course_links_course (course_id)' },
    { name: 'idx_sop_course_links_sop', definition: 'INDEX idx_sop_course_links_sop (sop_id)' },
    { name: 'idx_sop_course_links_module', definition: 'INDEX idx_sop_course_links_module (module_id)' },
  ];

  for (const idx of indexMigrations) {
    try {
      await pool.query(`ALTER TABLE sop_course_links ADD ${idx.definition}`);
      console.log(`SOP course link index added: ${idx.name}`);
    } catch (err) {
      const ignoreCodes = ['ER_DUP_KEYNAME', 1061];
      if (ignoreCodes.includes(err.code) || ignoreCodes.includes(err.errno)) {
        console.log(`SOP course link index already exists: ${idx.name}`);
      } else {
        console.error(`SOP course link index migration error (${idx.name}):`, err.message);
      }
    }
  }

  console.log('SOP course link migrations applied');
}

module.exports = { runSopCourseLinkMigrations };

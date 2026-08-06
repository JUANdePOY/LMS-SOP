const db = require('../config/database');

const CERTIFICATE_COURSE_LINK_MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS certificate_course_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    certificate_template_id INT NOT NULL,
    course_id INT NOT NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 1,
    display_order INT NOT NULL DEFAULT 0,
    created_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (certificate_template_id) REFERENCES certificate_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_cert_links_course (course_id),
    INDEX idx_cert_links_template (certificate_template_id),
    UNIQUE KEY uk_cert_links_course_template (certificate_template_id, course_id, deleted_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function runCertificateCourseLinkMigrations() {
  const pool = db.getPool ? db.getPool() : db;
  for (const sql of CERTIFICATE_COURSE_LINK_MIGRATIONS) {
    if (!sql || !sql.trim()) continue;
    try {
      await pool.query(sql);
    } catch (err) {
      const ignoreCodes = ['ER_TABLE_EXISTS_ERROR', 1050];
      if (ignoreCodes.includes(err.code) || ignoreCodes.includes(err.errno)) {
        console.log('Certificate course link migration skipped (table exists):', sql.split('\n')[0]);
      } else {
        console.error('Certificate course link migration error:', err.message);
        console.error('Offending SQL:', sql);
      }
    }
  }
  console.log('Certificate course link migrations applied');
}

module.exports = { runCertificateCourseLinkMigrations, CERTIFICATE_COURSE_LINK_MIGRATIONS };

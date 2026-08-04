const CERTIFICATE_MANAGEMENT_MIGRATIONS = [
  // --------------------------------------------------------
  // certificate_templates
  // --------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS certificate_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(36) NOT NULL DEFAULT (UUID()),
    name VARCHAR(150) NOT NULL,
    department_id INT DEFAULT NULL,
    frame_filename VARCHAR(255) NOT NULL,
    frame_storage_path VARCHAR(500) NOT NULL,
    orientation ENUM('landscape','portrait') NOT NULL DEFAULT 'landscape',
    width_px INT NOT NULL,
    height_px INT NOT NULL,
    sections LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL
      CHECK (json_valid(sections)),
    status ENUM('draft','active','archived') NOT NULL DEFAULT 'draft',
    created_by INT NOT NULL,
    updated_by INT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    UNIQUE KEY certificate_templates_public_id_unique (public_id),
    INDEX idx_certificate_templates_status (status),
    INDEX idx_certificate_templates_department (department_id),
    INDEX idx_certificate_templates_deleted (is_deleted),
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // --------------------------------------------------------
  // certificate_signatures (also used for seal images)
  // --------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS certificate_signatures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    label VARCHAR(150) NOT NULL,
    type ENUM('signature','seal') NOT NULL DEFAULT 'signature',
    filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NULL,
    signature_data LONGBLOB NULL,
    signature_mime_type VARCHAR(100) DEFAULT NULL,
    signature_size BIGINT DEFAULT NULL,
    signature_original_name VARCHAR(255) DEFAULT NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_certificate_signatures_type (type),
    INDEX idx_certificate_signatures_deleted (is_deleted),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // --------------------------------------------------------
  // certificate_issuances
  // --------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS certificate_issuances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    certificate_number CHAR(36) NOT NULL DEFAULT (UUID()),
    template_id INT NOT NULL,
    user_id INT NOT NULL,
    resolved_sections LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL
      CHECK (json_valid(resolved_sections)),
    pdf_storage_path VARCHAR(500) DEFAULT NULL,
    status ENUM('active','revoked') NOT NULL DEFAULT 'active',
    issued_by INT DEFAULT NULL,
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME DEFAULT NULL,
    revoked_at DATETIME DEFAULT NULL,
    UNIQUE KEY certificate_issuances_certificate_number_unique (certificate_number),
    INDEX idx_certificate_issuances_user (user_id),
    INDEX idx_certificate_issuances_template (template_id),
    INDEX idx_certificate_issuances_status (status),
    FOREIGN KEY (template_id) REFERENCES certificate_templates(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // --------------------------------------------------------
  // Schema compatibility fixes for existing tables
  // --------------------------------------------------------
  // certificate_templates: add sections column if missing
  `ALTER TABLE certificate_templates ADD COLUMN sections LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(sections)) AFTER height_px`,

  // certificate_templates: add frame binary and metadata columns for LONGBLOB storage
  `ALTER TABLE certificate_templates
    ADD COLUMN IF NOT EXISTS frame_data LONGBLOB NULL AFTER frame_storage_path,
    ADD COLUMN IF NOT EXISTS frame_mime_type VARCHAR(100) DEFAULT NULL AFTER frame_data,
    ADD COLUMN IF NOT EXISTS frame_size BIGINT DEFAULT NULL AFTER frame_mime_type,
    ADD COLUMN IF NOT EXISTS frame_original_name VARCHAR(255) DEFAULT NULL AFTER frame_filename`,

  // certificate_templates: add missing indexes if missing
  `CREATE INDEX idx_certificate_templates_status ON certificate_templates(status)`,
  `CREATE INDEX idx_certificate_templates_department ON certificate_templates(department_id)`,
  `CREATE INDEX idx_certificate_templates_deleted ON certificate_templates(is_deleted)`,

  // certificate_signatures: add type column if missing
  `ALTER TABLE certificate_signatures ADD COLUMN type ENUM('signature','seal') NOT NULL DEFAULT 'signature' AFTER label`,
  `CREATE INDEX idx_certificate_signatures_type ON certificate_signatures(type)`,
  `CREATE INDEX idx_certificate_signatures_deleted ON certificate_signatures(is_deleted)`,
  `ALTER TABLE certificate_signatures MODIFY COLUMN storage_path VARCHAR(500) NULL`,
  `ALTER TABLE certificate_signatures
    ADD COLUMN IF NOT EXISTS signature_data LONGBLOB NULL AFTER storage_path,
    ADD COLUMN IF NOT EXISTS signature_mime_type VARCHAR(100) DEFAULT NULL AFTER signature_data,
    ADD COLUMN IF NOT EXISTS signature_size BIGINT DEFAULT NULL AFTER signature_mime_type,
    ADD COLUMN IF NOT EXISTS signature_original_name VARCHAR(255) DEFAULT NULL AFTER filename`,

  // certificate_issuances: add resolved_sections if missing
  `ALTER TABLE certificate_issuances ADD COLUMN resolved_sections LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(resolved_sections)) AFTER user_id`,
  // certificate_issuances: add missing columns if missing
  `ALTER TABLE certificate_issuances ADD COLUMN expires_at DATETIME DEFAULT NULL AFTER issued_at`,
  `ALTER TABLE certificate_issuances ADD COLUMN revoked_at DATETIME DEFAULT NULL AFTER expires_at`,
  // certificate_issuances: add missing indexes if missing
  `CREATE INDEX idx_certificate_issuances_user ON certificate_issuances(user_id)`,
  `CREATE INDEX idx_certificate_issuances_template ON certificate_issuances(template_id)`,
  `CREATE INDEX idx_certificate_issuances_status ON certificate_issuances(status)`,
];

async function runCertificateMigrations() {
  const dbPool = require('../config/database');
  for (const sql of CERTIFICATE_MANAGEMENT_MIGRATIONS) {
    if (!sql || !sql.trim()) continue;
    try {
      await dbPool.query(sql);
    } catch (err) {
      const ignoreCodes = ['ER_DUP_COLUMN', 'ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME', 1060, 1050, 1061, 121];
      if (ignoreCodes.includes(err.code) || ignoreCodes.includes(err.errno)) {
        console.log('Certificate migration skipped:', sql.split('\n')[0]);
      } else {
        console.error('Certificate migration error:', err.message);
        console.error('Offending SQL:', sql);
      }
    }
  }
}

module.exports = { runCertificateMigrations, CERTIFICATE_MANAGEMENT_MIGRATIONS };

/**
 * create-sop-tables.js
 * Creates all SOP management tables that are missing from the database.
 * Run: node server/create-sop-tables.js
 */
const path = require('path');
const fs = require('fs');
const lockFile = path.join(__dirname, '.tmp', 'db-init.lock');
try { if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile); } catch (e) {}

const db = require('./config/database');

const SOP_TABLES = [
  // 1. sops - master SOP records
  `CREATE TABLE IF NOT EXISTS sops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    department_id INT DEFAULT NULL,
    category_id INT DEFAULT NULL,
    owner_user_id INT DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSON DEFAULT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_sops_code (code),
    INDEX idx_sop_code (code),
    INDEX idx_sop_title (title),
    INDEX idx_status (status),
    INDEX idx_sops_department (department_id),
    INDEX idx_sops_owner (owner_user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 2. sop_sections
  `CREATE TABLE IF NOT EXISTS sop_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    section_type VARCHAR(100) NOT NULL DEFAULT 'custom',
    content TEXT DEFAULT NULL,
    order_index INT NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sop_sections_sop (sop_id),
    INDEX idx_sop_sections_order (sop_id, order_index)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 3. sop_steps
  `CREATE TABLE IF NOT EXISTS sop_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_id INT NOT NULL,
    section_id INT DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    step_number INT NOT NULL DEFAULT 1,
    order_index INT NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sop_steps_sop (sop_id),
    INDEX idx_sop_steps_order (sop_id, order_index)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 4. sop_versions
  `CREATE TABLE IF NOT EXISTS sop_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_id INT NOT NULL,
    version_number VARCHAR(50) NOT NULL DEFAULT '1.0',
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    content_snapshot JSON DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    created_by INT DEFAULT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_sop_versions_sop (sop_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 5. sop_documents
  `CREATE TABLE IF NOT EXISTS sop_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) DEFAULT NULL,
    file_size INT DEFAULT NULL,
    storage_path VARCHAR(500) NOT NULL,
    uploaded_by INT DEFAULT NULL,
    document_type VARCHAR(100) NOT NULL DEFAULT 'PDF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sop_documents_sop (sop_id),
    INDEX idx_sop_documents_deleted (is_deleted)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 6. sop_assignments
  `CREATE TABLE IF NOT EXISTS sop_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_id INT NOT NULL,
    assignment_type VARCHAR(100) NOT NULL DEFAULT 'User',
    department_id INT DEFAULT NULL,
    position_title VARCHAR(255) DEFAULT NULL,
    user_id INT DEFAULT NULL,
    assigned_by INT DEFAULT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sop_assignments_sop (sop_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 7. sop_acknowledgements
  `CREATE TABLE IF NOT EXISTS sop_acknowledgements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_id INT NOT NULL,
    user_id INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ack_user_status (user_id, status),
    INDEX idx_sop_ack_sop (sop_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 8. sop_approvals
  `CREATE TABLE IF NOT EXISTS sop_approvals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_id INT NOT NULL,
    approver_user_id INT DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    comments TEXT DEFAULT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sop_approvals_sop (sop_id),
    INDEX idx_sop_approvals_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 9. sop_change_logs
  `CREATE TABLE IF NOT EXISTS sop_change_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_id INT NOT NULL,
    changed_by INT DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    old_value VARCHAR(255) DEFAULT NULL,
    new_value VARCHAR(255) DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sop_change_logs_sop (sop_id),
    INDEX idx_sop_change_logs_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 10. sop_shares
  `CREATE TABLE IF NOT EXISTS sop_shares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_id INT NOT NULL,
    share_type VARCHAR(100) NOT NULL DEFAULT 'internal',
    share_with VARCHAR(255) DEFAULT NULL,
    permissions VARCHAR(100) NOT NULL DEFAULT 'view',
    created_by INT DEFAULT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sop_shares_sop (sop_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function createTables() {
  console.log('Creating SOP management tables...\n');
  let success = 0;
  let failed = 0;

  for (const sql of SOP_TABLES) {
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)?.[1] || 'unknown';
    try {
      await db.query(sql);
      console.log('  ✓ ' + tableName);
      success++;
    } catch (err) {
      console.log('  ✗ ' + tableName + ': ' + err.message);
      failed++;
    }
  }

  console.log('\nDone: ' + success + ' created, ' + failed + ' failed');
  process.exit(failed > 0 ? 1 : 0);
}

createTables().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

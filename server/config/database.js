require('dotenv').config();
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pafr',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 10,
  connectTimeout: 30000,
  timezone: '+00:00',
  multipleStatements: true,
  charset: 'utf8mb4',
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 800;

async function withRetry(fn, label = 'query') {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = (err && err.message) ? err.message : String(err);
      const transient = msg.includes('ECONNRESET') || msg.includes('PROTOCOL_CONNECTION_LOST') || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED');
      if (!transient || attempt === MAX_RETRIES) {
        throw err;
      }
      console.warn(`MySQL ${label} transient error (attempt ${attempt}/${MAX_RETRIES}): ${msg}`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * attempt));
    }
  }
  throw lastErr;
}

let pool = null;
let dbInstance = null;
let initPromise = null;

function patchPoolMethods(target, source) {
  for (const method of ['query', 'getConnection', 'execute']) {
    if (typeof source[method] === 'function') {
      const original = source[method].bind(source);
      target[method] = function (...args) {
        const cb = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;
        const wrappedArgs = cb ? args.slice(0, -1) : args;
        const run = async () => {
          if (cb) {
            return new Promise((resolve, reject) => {
              original(...wrappedArgs, (err, ...rest) => {
                if (err) return reject(err);
                resolve(...rest);
              });
            });
          }
          return original(...wrappedArgs);
        };
        if (cb) {
          withRetry(() => run()).then(
            (result) => cb(null, result),
            (err) => cb(err)
          );
        } else {
          return withRetry(() => run());
        }
      };
    }
  }
}

function getPool() {
  if (dbInstance) return dbInstance;
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    const rawPromise = pool.promise();

    pool.on('error', (err) => {
      const msg = (err && err.message) ? err.message : String(err);
      if (msg.includes('ECONNRESET') || msg.includes('PROTOCOL_CONNECTION_LOST')) return;
      console.error('MySQL pool error:', msg);
    });

    pool.on('connection', (connection) => {
      connection.on('error', (err) => {
        const msg = (err && err.message) ? err.message : String(err);
        if (msg.includes('ECONNRESET') || msg.includes('PROTOCOL_CONNECTION_LOST')) return;
        console.error('MySQL connection error:', msg);
      });
      connection.on('close', () => {
        console.log('MySQL connection closed');
      });
    });

    patchPoolMethods(rawPromise, pool.promise());

    dbInstance = rawPromise;
    dbInstance.rawPool = pool;
  }
  return dbInstance;
}

function ensureStartupLock() {
  try {
    const lockDir = path.join(__dirname, '..', '.tmp');
    if (!fs.existsSync(lockDir)) {
      fs.mkdirSync(lockDir, { recursive: true });
    }
    const lockFile = path.join(lockDir, 'db-init.lock');
    if (fs.existsSync(lockFile)) {
      const pid = parseInt(fs.readFileSync(lockFile, 'utf8'), 10);
      try {
        process.kill(pid, 0);
        console.warn(`Another Node process (pid ${pid}) appears to already be running. Exiting duplicate instance.`);
        setTimeout(() => process.exit(0), 100);
        return false;
      } catch {
        fs.unlinkSync(lockFile);
      }
    }
    fs.writeFileSync(lockFile, String(process.pid));
    return true;
  } catch {
    return true;
  }
}

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    parent_department_id INT DEFAULT NULL,
    head_user_id INT DEFAULT NULL,
    status ENUM('active','inactive','archived') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_departments_code (code),
    INDEX idx_departments_parent (parent_department_id),
    INDEX idx_departments_head (head_user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS department_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('member','head','admin') NOT NULL DEFAULT 'member',
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_dept_member (department_id, user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INT DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS position_title VARCHAR(255) DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100) DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50) DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_status ENUM('Regular','Probationary','Contractual','Resigned/Terminated','Retired','On Leave') DEFAULT 'Regular'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS date_hired DATE DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS birthdate DATE DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at DATETIME DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
  `CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_roles_name (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    category VARCHAR(100) DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_permissions_name (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL,
    permission_name VARCHAR(100) NOT NULL,
    granted_by INT DEFAULT NULL,
    granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_name) REFERENCES roles(name) ON DELETE CASCADE,
    FOREIGN KEY (permission_name) REFERENCES permissions(name) ON DELETE CASCADE,
    UNIQUE KEY uk_role_perm (role_name, permission_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_role_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    old_role VARCHAR(100) DEFAULT NULL,
    new_role VARCHAR(100) NOT NULL,
    old_department_id INT DEFAULT NULL,
    new_department_id INT DEFAULT NULL,
    changed_by INT DEFAULT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_role_history_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(500) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_logs_user (user_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_entity (entity_type, entity_id),
    INDEX idx_audit_logs_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT DEFAULT NULL,
    type ENUM('info','warning','success','error') NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(500) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (is_read)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS businesses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_code VARCHAR(50) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    logo_url VARCHAR(500) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by INT DEFAULT NULL,
    updated_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_business_code (business_code),
    INDEX idx_businesses_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `ALTER TABLE departments ADD COLUMN business_id INT DEFAULT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_departments_business ON departments(business_id)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS business_id INT DEFAULT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id)`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    parent_category_id INT DEFAULT NULL,
    status ENUM('active','inactive','archived') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE SET NULL,
    UNIQUE KEY uk_categories_code (code),
    INDEX idx_categories_parent (parent_category_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  // ---------------------------------------------------------------------
  // NOTE: the legacy v1 flat-schema definitions for sops / sop_sections /
  // sop_steps / sop_versions / sop_documents / sop_assignments /
  // sop_acknowledgements that used to live here have been removed. They
  // described a completely different (and in places invalid — e.g.
  // section_type defaulting to 'custom', which isn't a member of the real
  // ENUM) schema than the one the app's models actually target (public_id/
  // sop_code/sop_version_id-keyed tables). On an existing database they
  // were harmless no-ops (CREATE TABLE IF NOT EXISTS), but on a fresh
  // database they would have bootstrapped the wrong schema entirely. The
  // real schema lives in the project's .sql dump/migration tool now — this
  // file should not be trying to (re)create those tables.
  // ---------------------------------------------------------------------
   `CREATE TABLE IF NOT EXISTS sop_approvals (
     id INT AUTO_INCREMENT PRIMARY KEY,
     sop_id INT NOT NULL,
     sop_version_id INT NULL,
     approver_user_id INT DEFAULT NULL,
     status VARCHAR(50) NOT NULL DEFAULT 'Pending',
     comments TEXT DEFAULT NULL,
     is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE,
     FOREIGN KEY (sop_version_id) REFERENCES sop_versions(id) ON DELETE SET NULL,
     FOREIGN KEY (approver_user_id) REFERENCES users(id) ON DELETE SET NULL,
     INDEX idx_sop_approvals_sop (sop_id),
     INDEX idx_sop_approvals_version (sop_version_id),
     INDEX idx_sop_approvals_status (status)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
   // --- approval_workflows, workflow_steps, workflow_instances, workflow_actions ---
   `CREATE TABLE IF NOT EXISTS approval_workflows (
     id INT AUTO_INCREMENT PRIMARY KEY,
     public_id CHAR(36) NOT NULL DEFAULT (UUID()),
     name VARCHAR(150) NOT NULL,
     department_id INT NULL,
     description TEXT NULL,
     is_active TINYINT(1) NOT NULL DEFAULT 1,
     created_by INT NOT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     deleted_at DATETIME NULL,
     FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
     FOREIGN KEY (created_by) REFERENCES users(id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
   `CREATE TABLE IF NOT EXISTS workflow_steps (
     id INT AUTO_INCREMENT PRIMARY KEY,
     workflow_id INT NOT NULL,
     step_order INT NOT NULL,
     step_name VARCHAR(150) NOT NULL,
     approver_type ENUM('User','Role','Department') NOT NULL DEFAULT 'Role',
     approver_reference_id INT NULL,
     approver_role VARCHAR(100) NULL,
     is_required TINYINT(1) NOT NULL DEFAULT 1,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     deleted_at DATETIME NULL,
     FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
   `CREATE TABLE IF NOT EXISTS workflow_instances (
     id INT AUTO_INCREMENT PRIMARY KEY,
     public_id CHAR(36) NOT NULL DEFAULT (UUID()),
     sop_version_id INT NOT NULL,
     workflow_id INT NOT NULL,
     current_step_order INT NOT NULL DEFAULT 1,
     status ENUM('In Progress','Approved','Rejected','Cancelled') NOT NULL DEFAULT 'In Progress',
     started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     completed_at DATETIME NULL,
     created_by INT NOT NULL,
     FOREIGN KEY (sop_version_id) REFERENCES sop_versions(id) ON DELETE CASCADE,
     FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id),
     FOREIGN KEY (created_by) REFERENCES users(id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
   `CREATE TABLE IF NOT EXISTS workflow_actions (
     id INT AUTO_INCREMENT PRIMARY KEY,
     workflow_instance_id INT NOT NULL,
     workflow_step_id INT NOT NULL,
     actor_id INT NOT NULL,
     action ENUM('Submitted','Approved','Rejected','Delegated','Commented') NOT NULL,
     comments TEXT NULL,
     action_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE,
     FOREIGN KEY (workflow_step_id) REFERENCES workflow_steps(id),
     FOREIGN KEY (actor_id) REFERENCES users(id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS sop_change_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_id INT NOT NULL,
    changed_by INT DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    old_value VARCHAR(255) DEFAULT NULL,
    new_value VARCHAR(255) DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_sop_change_logs_sop (sop_id),
    INDEX idx_sop_change_logs_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
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
    FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_sop_shares_sop (sop_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
   // =========================================================================
   // SOP schema compatibility fix
   // DB_SOP.sql (v2.0) creates tables with sop_version_id NOT NULL and FKs to
   // sop_versions. But the app code uses flat sop_id / order_index / is_deleted.
   // This migration drops the v2.0 FK constraints, makes sop_version_id nullable,
   // adds the missing columns the app expects, and backfills existing data.
   // NOTE: sop_sections and sop_steps tables were removed in the SOP refactoring.
   // The legacy migration steps for these tables are no longer needed and are
   // skipped on databases that already use the new schema.
   // =========================================================================
   // --- sop_module_attachments: add link_url column for storing web links alongside file attachments ---
    `ALTER TABLE sop_module_attachments
      ADD COLUMN IF NOT EXISTS link_url VARCHAR(500) DEFAULT NULL AFTER file_size`,
    // --- sop_module_attachments: add missing columns (is_deleted, original_name, updated_at) ---
    `ALTER TABLE sop_module_attachments
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE AFTER download_count,
      ADD COLUMN IF NOT EXISTS original_name VARCHAR(255) DEFAULT NULL AFTER file_name,
      ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at`,
    // Create index for is_deleted on sop_module_attachments
    `CREATE INDEX IF NOT EXISTS idx_sop_module_attachments_deleted ON sop_module_attachments(is_deleted)`,
    // --- sop_modules: add sop_version_id column for version isolation ---
    `ALTER TABLE sop_modules
      ADD COLUMN IF NOT EXISTS sop_version_id INT NULL AFTER sop_id`,
    `CREATE INDEX IF NOT EXISTS idx_sop_modules_version ON sop_modules(sop_version_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sop_modules_sop_version ON sop_modules(sop_id, sop_version_id)`,
    // --- sop_module_attachments: add sop_version_id column for version isolation ---
    `ALTER TABLE sop_module_attachments
      ADD COLUMN IF NOT EXISTS sop_version_id INT NULL AFTER module_id`,
    `CREATE INDEX IF NOT EXISTS idx_sop_module_attachments_version ON sop_module_attachments(sop_version_id)`,
    // --- sop_approvals: add sop_version_id column ---
    `ALTER TABLE sop_approvals ADD COLUMN IF NOT EXISTS sop_version_id INT NULL AFTER sop_id`,
    `CREATE INDEX IF NOT EXISTS idx_sop_approvals_version ON sop_approvals(sop_version_id)`,
    // --- Task Management Module: create tables ---
    `CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT NULL,
      priority ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
      status ENUM('Pending','In Progress','Completed','Overdue','Cancelled') NOT NULL DEFAULT 'Pending',
      start_datetime DATETIME NOT NULL,
      deadline_datetime DATETIME NOT NULL,
      estimated_hours INT DEFAULT NULL,
      category VARCHAR(100) DEFAULT NULL,
      created_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_tasks_status (status),
      INDEX idx_tasks_priority (priority),
      INDEX idx_tasks_created_by (created_by),
      INDEX idx_tasks_deadline (deadline_datetime),
      INDEX idx_tasks_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS task_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      assignment_type ENUM('User','Department','Position') NOT NULL DEFAULT 'User',
      reference_id VARCHAR(255) NOT NULL,
      assigned_by INT NOT NULL,
      assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_task_assignments_task (task_id),
      INDEX idx_task_assignments_type (assignment_type, reference_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS task_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      user_id INT NOT NULL,
      completion_rate TINYINT NOT NULL DEFAULT 0,
      status ENUM('Pending','In Progress','Completed','Overdue','Cancelled') NOT NULL DEFAULT 'Pending',
      notes TEXT DEFAULT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY uk_task_progress_user_task (task_id, user_id),
      INDEX idx_task_progress_user (user_id),
      INDEX idx_task_progress_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS task_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_progress_id INT DEFAULT NULL,
      task_id INT NOT NULL,
      file_name VARCHAR(500) NOT NULL,
      original_name VARCHAR(500) NOT NULL,
      mime_type VARCHAR(100) DEFAULT NULL,
      size_bytes BIGINT DEFAULT NULL,
      file_data LONGBLOB DEFAULT NULL,
      uploaded_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_progress_id) REFERENCES task_progress(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_task_attachments_progress (task_progress_id),
      INDEX idx_task_attachments_task (task_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS task_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      user_id INT NOT NULL,
      comment TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_task_comments_task (task_id),
      INDEX idx_task_comments_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

async function runMigrations() {
  const db = getPool();
  for (const sql of MIGRATIONS) {
    if (!sql || !sql.trim()) continue;
    try {
      await db.query(sql);
    } catch (err) {
      const isDuplicateKey = /errno: 121|Duplicate key on write or update/.test(err.message);
      const ignoreCodes = [
        'ER_DUP_COLUMN', 'ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME',
        1060, 1050, 1061, 121
      ];
      if (
        ignoreCodes.includes(err.code) ||
        ignoreCodes.includes(err.errno) ||
        isDuplicateKey
      ) {
        console.log('Migration skipped (already exists):', sql.split('\n')[0]);
      } else {
        console.error('Migration error:', err.message);
        console.error('Offending SQL:', sql);
      }
    }
  }

  try {
    const { runCourseMigrations } = require('../migrations/courseManagement');
    await runCourseMigrations();
    console.log('Course management migrations applied');
  } catch (err) {
    console.error('Course management migration error:', err.message);
  }

  try {
    const { runAssessmentsMigrations } = require('../migrations/assessments');
    await runAssessmentsMigrations(db);
    console.log('Assessments migrations applied');
  } catch (err) {
    console.error('Assessments migration error:', err.message);
  }

  try {
    const { runCertificateMigrations } = require('../migrations/certificateManagement');
    await runCertificateMigrations();
    console.log('Certificate management migrations applied');
  } catch (err) {
    console.error('Certificate management migration error:', err.message);
  }

  try {
    const { runSopCourseLinkMigrations } = require('../migrations/sopCourseLinks');
    await runSopCourseLinkMigrations();
    console.log('SOP course link migrations applied');
  } catch (err) {
    console.error('SOP course link migration error:', err.message);
  }
}

async function initDatabase() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const shouldInit = ensureStartupLock();
    if (!shouldInit) {
      console.warn('Skipping duplicate DB init. Server will continue with existing pool.');
      return;
    }
    const db = getPool();
    try {
      await db.query('SELECT 1 as test');
      console.log('Database connected successfully');
    } catch (err) {
      console.error('Database connection failed:', err.message);
      if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
        console.error('Remote MySQL connection failed. Your local IP must be whitelisted in Hostinger.');
        console.error('Steps to fix:');
        console.error('  1. Log in to Hostinger hPanel');
        console.error('  2. Go to Databases → Remote MySQL');
        console.error('  3. Add your current IP to the whitelist');
        console.error('  4. Ensure the MySQL user has permissions on the database');
      }
      console.error('Server will start but DB-dependent features will fail');
    }
    await runMigrations();
  })();
  return initPromise;
}

const db = getPool();

db.rawPool = pool;

initDatabase().catch((err) => {
  console.error('Database init error:', err);
});

module.exports = db;
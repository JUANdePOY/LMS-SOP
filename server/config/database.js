require('dotenv').config();
const mysql = require('mysql2');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pafr',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000,
  timezone: '+00:00',
  multipleStatements: true,
  charset: 'utf8mb4',
  enableKeepAlive: true,
  keepAliveInitialDelay: 60000
};

const pool = mysql.createPool(dbConfig);

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
];

async function runMigrations() {
  const promisePool = pool.promise();
  for (const sql of MIGRATIONS) {
    if (!sql || !sql.trim()) continue;
    try {
      await promisePool.query(sql);
    } catch (err) {
      const ignoreCodes = [
        'ER_DUP_COLUMN', 'ER_TABLE_EXISTS_ERROR',
        1060, 1050
      ];
      if (
        ignoreCodes.includes(err.code) ||
        ignoreCodes.includes(err.errno)
      ) {
        console.log('Migration skipped (already exists):', sql.split('\n')[0]);
      } else {
        console.error('Migration error:', err.message);
        console.error('Offending SQL:', sql);
      }
    }
  }
}

pool.on('error', (err) => {
  console.error('MySQL pool error:', err.message);
});

pool.on('connection', (connection) => {
  connection.on('error', (err) => {
    console.error('MySQL connection error:', err.message);
  });
  connection.on('close', () => {
    console.log('MySQL connection closed');
  });
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
      console.error('Remote MySQL connection failed. Your local IP must be whitelisted in Hostinger.');
      console.error('Steps to fix:');
      console.error('  1. Log in to Hostinger hPanel');
      console.error('  2. Go to Databases → Remote MySQL');
      console.error('  3. Add your current IP to the whitelist');
      console.error('  4. Ensure the MySQL user has permissions on the database');
      console.error('Current local IP detected from error message above.');
    }
    console.error('Server will start but DB-dependent features will fail');
  } else {
    console.log('Database connected successfully');
    connection.release();
  }
  runMigrations();
});

const db = pool.promise();

db.getConnection = () => pool.promise().getConnection();

db.rawPool = pool;

module.exports = db;
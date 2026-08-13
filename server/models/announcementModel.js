const crypto = require('crypto');
const db = require('../config/database');

// JSON columns must receive a JSON-encoded string (or NULL), never a raw JS
// array — mysql2 would serialize an empty array as an empty SQL value and
// produce a syntax error. Accepts arrays/objects/strings and falls back to NULL.
function toJsonColumn(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length === 0) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  type ENUM('General','Training','Deployment','Administrative','Emergency') NOT NULL DEFAULT 'General',
  priority ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  author VARCHAR(100) NOT NULL DEFAULT 'CO Admin',
  body TEXT NOT NULL,
  business_id INT DEFAULT NULL,
  target_roles JSON DEFAULT NULL,
  target_departments JSON DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_type (type),
  KEY idx_priority (priority),
  KEY idx_status (status),
  KEY idx_created (created_at DESC),
  KEY idx_business_id (business_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

async function ensureTable() {
  try {
    await db.query(CREATE_TABLE_SQL);
  } catch (err) {
    console.error('Failed to ensure announcements table:', err.message);
  }
}

ensureTable();

const announcementModel = {
  async findAll(filters = {}) {
    const { business_id, type, priority, status, target_role, target_department, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    const params = [];
    const where = [];

    if (business_id) {
      where.push('business_id = ?');
      params.push(business_id);
    }
    if (type) {
      where.push('type = ?');
      params.push(type);
    }
    if (priority) {
      where.push('priority = ?');
      params.push(priority);
    }
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    if (target_role) {
      where.push('(target_roles IS NULL OR JSON_CONTAINS(target_roles, ?) OR JSON_LENGTH(target_roles) = 0)');
      params.push(JSON.stringify([target_role]));
    }
    if (target_department) {
      where.push('(target_departments IS NULL OR JSON_CONTAINS(target_departments, ?) OR JSON_LENGTH(target_departments) = 0)');
      params.push(JSON.stringify([String(target_department)]));
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await db.query(
      `SELECT * FROM announcements ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM announcements WHERE id = ?', [id]);
    return rows[0];
  },

  async create(announcement) {
    const { title, type, priority, status, author, body, business_id, target_roles, target_departments } = announcement;
    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO announcements (id, title, type, priority, status, author, body, business_id, target_roles, target_departments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, type || 'General', priority || 'medium', status || 'active', author || 'CO Admin', body, business_id || null, toJsonColumn(target_roles), toJsonColumn(target_departments)]
    );
    return this.findById(id);
  },

  async update(id, announcement) {
    const { title, type, priority, status, author, body, business_id, target_roles, target_departments } = announcement;
    await db.query(
      'UPDATE announcements SET title = ?, type = ?, priority = ?, status = ?, author = ?, body = ?, business_id = ?, target_roles = ?, target_departments = ? WHERE id = ?',
      [title, type, priority, status, author, body, business_id, toJsonColumn(target_roles), toJsonColumn(target_departments), id]
    );
    return this.findById(id);
  },

  async delete(id) {
    await db.query('DELETE FROM announcements WHERE id = ?', [id]);
    return { id };
  },
};

module.exports = announcementModel;
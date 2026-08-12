const crypto = require('crypto');
const db = require('../config/database');

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  type ENUM('General','Training','Deployment','Administrative','Emergency') NOT NULL DEFAULT 'General',
  priority ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  author VARCHAR(100) NOT NULL DEFAULT 'CO Admin',
  body TEXT NOT NULL,
  business_id INT DEFAULT NULL,
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
    const { business_id, type, priority, status, page = 1, limit = 20 } = filters;
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
    const { title, type, priority, status, author, body, business_id } = announcement;
    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO announcements (id, title, type, priority, status, author, body, business_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, type || 'General', priority || 'medium', status || 'active', author || 'CO Admin', body, business_id || null]
    );
    return this.findById(id);
  },

  async update(id, announcement) {
    const { title, type, priority, status, author, body, business_id } = announcement;
    await db.query(
      'UPDATE announcements SET title = ?, type = ?, priority = ?, status = ?, author = ?, body = ?, business_id = ? WHERE id = ?',
      [title, type, priority, status, author, body, business_id, id]
    );
    return this.findById(id);
  },

  async delete(id) {
    await db.query('DELETE FROM announcements WHERE id = ?', [id]);
    return { id };
  },
};

module.exports = announcementModel;
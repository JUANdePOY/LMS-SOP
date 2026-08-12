const crypto = require('crypto');
const db = require('../config/database');

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  event_type ENUM('Training','Deployment','Meeting','Emergency','Other') NOT NULL DEFAULT 'Training',
  priority ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
  status ENUM('active','inactive','completed','cancelled') NOT NULL DEFAULT 'active',
  event_date DATETIME NOT NULL,
  end_date DATETIME DEFAULT NULL,
  location VARCHAR(255) DEFAULT NULL,
  organizer VARCHAR(100) NOT NULL DEFAULT 'CO Admin',
  business_id INT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_event_type (event_type),
  KEY idx_priority (priority),
  KEY idx_status (status),
  KEY idx_event_date (event_date),
  KEY idx_business_id (business_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

async function ensureTable() {
  try {
    await db.query(CREATE_TABLE_SQL);
  } catch (err) {
    console.error('Failed to ensure events table:', err.message);
  }
}

ensureTable();

const eventModel = {
  async findAll(filters = {}) {
    const { business_id, event_type, priority, status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    const params = [];
    const where = [];

    if (business_id) {
      where.push('business_id = ?');
      params.push(business_id);
    }
    if (event_type) {
      where.push('event_type = ?');
      params.push(event_type);
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
      `SELECT * FROM events ${whereSql} ORDER BY event_date ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM events WHERE id = ?', [id]);
    return rows[0];
  },

  async create(event) {
    const { title, description, event_type, priority, status, event_date, end_date, location, organizer, business_id } = event;
    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO events (id, title, description, event_type, priority, status, event_date, end_date, location, organizer, business_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, description, event_type || 'Training', priority || 'medium', status || 'active', event_date, end_date, location, organizer || 'CO Admin', business_id || null]
    );
    return this.findById(id);
  },

  async update(id, event) {
    const { title, description, event_type, priority, status, event_date, end_date, location, organizer, business_id } = event;
    await db.query(
      'UPDATE events SET title = ?, description = ?, event_type = ?, priority = ?, status = ?, event_date = ?, end_date = ?, location = ?, organizer = ?, business_id = ? WHERE id = ?',
      [title, description, event_type, priority, status, event_date, end_date, location, organizer, business_id, id]
    );
    return this.findById(id);
  },

  async delete(id) {
    await db.query('DELETE FROM events WHERE id = ?', [id]);
    return { id };
  },

  async findActive() {
    const [rows] = await db.query(
      "SELECT * FROM events WHERE status = 'active' ORDER BY event_date ASC"
    );
    return rows;
  },
};

module.exports = eventModel;

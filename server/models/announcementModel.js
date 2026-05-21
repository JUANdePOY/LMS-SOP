const crypto = require('crypto');
const db = require('../config/database');

const announcementModel = {
  async findAll() {
    const [rows] = await db.query('SELECT * FROM announcements ORDER BY created_at DESC');
    return rows;
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM announcements WHERE id = ?', [id]);
    return rows[0];
  },

  async create(announcement) {
    const { title, type, priority, status, author, body } = announcement;
    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO announcements (id, title, type, priority, status, author, body) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, title, type || 'General', priority || 'medium', status || 'active', author || 'CO Admin', body]
    );
    return this.findById(id);
  },

  async update(id, announcement) {
    const { title, type, priority, status, author, body } = announcement;
    await db.query(
      'UPDATE announcements SET title = ?, type = ?, priority = ?, status = ?, author = ?, body = ? WHERE id = ?',
      [title, type, priority, status, author, body, id]
    );
    return this.findById(id);
  },

  async delete(id) {
    await db.query('DELETE FROM announcements WHERE id = ?', [id]);
    return { id };
  },
};

module.exports = announcementModel;
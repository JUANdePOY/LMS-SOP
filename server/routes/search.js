const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

const SEARCHABLE_CATEGORIES = ['users', 'courses', 'sops', 'departments', 'announcements', 'events'];

const MAX_TOTAL = 60;
const PER_CATEGORY = 12;

async function searchAll(query, categories, requestingUser) {
  const term = `%${query}%`;
  const results = {};
  const errors = {};

  const tasks = [];

  if (categories.includes('users')) {
    tasks.push((async () => {
      try {
        const [rows] = await db.query(
          `SELECT u.id, u.full_name, u.email, u.employee_id, u.role, u.department_id,
                  d.name AS department_name, b.business_name
           FROM users u
           LEFT JOIN departments d ON u.department_id = d.id
           LEFT JOIN businesses b ON u.business_id = b.id
           WHERE (u.full_name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)
             AND u.is_active = TRUE
           ORDER BY u.created_at DESC LIMIT ?`,
          [term, term, term, PER_CATEGORY]
        );
        results.users = rows;
      } catch (err) {
        errors.users = err.message;
      }
    })());
  }

  if (categories.includes('courses')) {
    tasks.push((async () => {
      try {
        const [rows] = await db.query(
          `SELECT c.id, c.title, c.description, c.category, c.difficulty, c.status,
                  c.thumbnail_url, u.full_name AS instructor_name
           FROM courses c
           LEFT JOIN users u ON c.instructor_id = u.id
           WHERE c.is_deleted = FALSE AND (c.title LIKE ? OR c.description LIKE ?)
           ORDER BY c.created_at DESC LIMIT ?`,
          [term, term, PER_CATEGORY]
        );
        results.courses = rows;
      } catch (err) {
        errors.courses = err.message;
      }
    })());
  }

  if (categories.includes('sops')) {
    tasks.push((async () => {
      try {
        const cols = await getSopsColumns();
        const ownerCol = cols.owner;
        const notDeleted = cols.softDelete === 'is_deleted'
          ? `(s.is_deleted = 0 OR s.is_deleted IS NULL)`
          : `s.deleted_at IS NULL`;
        const restriction = buildSopRestriction(requestingUser, cols);
        let sql = `
          SELECT s.id, s.title, s.${cols.code} AS code, s.description, s.status,
                 d.name AS department_name, c.name AS category_name, u.full_name AS owner_name
          FROM sops s
          LEFT JOIN departments d ON s.department_id = d.id
          LEFT JOIN categories c ON s.category_id = c.id
          LEFT JOIN users u ON s.${ownerCol} = u.id
          WHERE ${notDeleted} AND (s.title LIKE ? OR s.${cols.code} LIKE ? OR s.description LIKE ?)`;
        const params = [term, term, term];
        if (restriction.sql) {
          sql += ` AND ${restriction.sql}`;
          params.push(...restriction.params);
        }
        sql += ` ORDER BY s.created_at DESC LIMIT ?`;
        params.push(PER_CATEGORY);
        const [rows] = await db.query(sql, params);
        results.sops = rows;
      } catch (err) {
        errors.sops = err.message;
      }
    })());
  }

  if (categories.includes('departments')) {
    tasks.push((async () => {
      try {
        const [rows] = await db.query(
          `SELECT id, name, code, description, status FROM departments
           WHERE name LIKE ? OR code LIKE ?
           ORDER BY name ASC LIMIT ?`,
          [term, term, PER_CATEGORY]
        );
        results.departments = rows;
      } catch (err) {
        errors.departments = err.message;
      }
    })());
  }

  if (categories.includes('announcements')) {
    tasks.push((async () => {
      try {
        const [rows] = await db.query(
          `SELECT id, title, type, priority, status, author, created_at FROM announcements
           WHERE status = 'active' AND (title LIKE ? OR body LIKE ?)
           ORDER BY created_at DESC LIMIT ?`,
          [term, term, PER_CATEGORY]
        );
        results.announcements = rows;
      } catch (err) {
        errors.announcements = err.message;
      }
    })());
  }

  if (categories.includes('events')) {
    tasks.push((async () => {
      try {
        const [rows] = await db.query(
          `SELECT id, title, description, event_type, priority, status, event_date, location FROM events
           WHERE (title LIKE ? OR description LIKE ? OR location LIKE ?)
           ORDER BY event_date ASC LIMIT ?`,
          [term, term, term, PER_CATEGORY]
        );
        results.events = rows;
      } catch (err) {
        errors.events = err.message;
      }
    })());
  }

  await Promise.all(tasks);

  const total = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  return { results, total, errors, truncated: total >= MAX_TOTAL };
}

function getSopsColumns() {
  return getColumns('sops');
}

async function getColumns(table) {
  const [rows] = await db.query(`
    SELECT COLUMN_NAME, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
  `, [table]);
  return {
    has: (name) => rows.some(r => r.COLUMN_NAME === name),
    code: rows.some(r => r.COLUMN_NAME === 'code') ? 'code' : (rows.some(r => r.COLUMN_NAME === 'sop_code') ? 'sop_code' : 'code'),
    owner: rows.some(r => r.COLUMN_NAME === 'owner_user_id') ? 'owner_user_id' : (rows.some(r => r.COLUMN_NAME === 'owner_id') ? 'owner_id' : 'owner_user_id'),
    softDelete: rows.some(r => r.COLUMN_NAME === 'is_deleted') ? 'is_deleted' : (rows.some(r => r.COLUMN_NAME === 'deleted_at') ? 'deleted_at' : 'is_deleted'),
    hasRestrictionType: rows.some(r => r.COLUMN_NAME === 'restriction_type'),
    hasDepartment: rows.some(r => r.COLUMN_NAME === 'department_id'),
    hasCategory: rows.some(r => r.COLUMN_NAME === 'category_id'),
  };
}

function buildSopRestriction(user, cols) {
  if (!user || !cols.hasRestrictionType) return { sql: '', params: [] };
  const role = user.role || '';
  if (role === 'admin' || role === 'super_admin') return { sql: '', params: [] };
  const userDepartmentId = user.department_id || null;
  const userId = user.id || null;
  const sql = `(
    s.restriction_type = 'public'
    OR (s.restriction_type = 'department' AND s.department_id = ?)
    OR (s.restriction_type = 'assigned' AND EXISTS (
      SELECT 1 FROM sop_assignments sa
      LEFT JOIN assignment_departments ad ON ad.assignment_id = sa.id
      LEFT JOIN assignment_users au ON au.assignment_id = sa.id
      WHERE sa.sop_version_id = (SELECT current_version_id FROM sops WHERE id = s.id)
        AND sa.is_deleted = FALSE
        AND (au.user_id = ? OR ad.department_id = ?)
    ))
    OR (s.restriction_type = 'private' AND s.${cols.owner} = ?)
  )`;
  return { sql, params: [userDepartmentId, userId, userDepartmentId, userId] };
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q: rawQuery, categories: rawCategories = SEARCHABLE_CATEGORIES.join(',') } = req.query;
    const query = (rawQuery || '').trim();

    if (!query) {
      return res.json({ status: 'success', data: { results: {}, total: 0, query: '' } });
    }

    if (query.length > 200) {
      return res.status(400).json({ status: 'error', message: 'Search query too long', code: 'VALIDATION_ERROR' });
    }

    let requested = rawCategories.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
    const categories = requested.length
      ? requested.filter(c => SEARCHABLE_CATEGORIES.includes(c))
      : SEARCHABLE_CATEGORIES;

    const data = await searchAll(query, categories, req.user);
    res.json({ status: 'success', data });
  } catch (err) {
    console.error('Global search error:', err);
    res.status(500).json({ status: 'error', message: 'Search failed', code: 'DB_ERROR' });
  }
});

module.exports = router;
module.exports.SEARCHABLE_CATEGORIES = SEARCHABLE_CATEGORIES;
module.exports.searchAll = searchAll;

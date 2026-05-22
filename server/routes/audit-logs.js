const express = require('express');
const { query, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const rejectInvalid = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  return next();
};

const pageLimitValidators = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

const idParam = [param('id').isInt({ min: 1 })];

// GET /api/audit-logs - List with filters (admin only, read-only)
router.get(
  '/',
  authenticateToken,
  requireAdmin,
  pageLimitValidators,
  [
    query('action').optional().isString().trim().isLength({ max: 100 }),
    query('entity_type').optional().isString().trim().isLength({ max: 50 }),
    query('user_id').optional().isInt({ min: 1 }),
    query('from').optional().isISO8601().toDate(),
    query('to').optional().isISO8601().toDate(),
    query('search').optional().isString().trim().isLength({ max: 200 }),
  ],
  rejectInvalid,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 25,
        action,
        entity_type,
        user_id,
        from,
        to,
        search,
      } = req.query;

      const offset = (page - 1) * limit;

      const conditions = [];
      const params = [];

      if (action) {
        conditions.push('a.action LIKE ?');
        params.push(`%${action}%`);
      }
      if (entity_type) {
        conditions.push('a.entity_type = ?');
        params.push(entity_type);
      }
      if (user_id) {
        conditions.push('a.user_id = ?');
        params.push(user_id);
      }
      if (from) {
        conditions.push('a.created_at >= ?');
        params.push(from);
      }
      if (to) {
        conditions.push('a.created_at <= ?');
        params.push(to);
      }
      if (search) {
        conditions.push('(a.action LIKE ? OR a.entity_type LIKE ? OR COALESCE(u.email, "") LIKE ?)');
        const s = `%${search}%`;
        params.push(s, s, s);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      // Total count
      const [countRows] = await db.query(
        `SELECT COUNT(*) as total FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id ${where}`,
        params
      );
      const total = countRows[0]?.total || 0;

      // Data
      const [rows] = await db.query(
        `
          SELECT 
            a.id,
            a.user_id,
            a.action,
            a.entity_type,
            a.entity_id,
            a.old_values,
            a.new_values,
            a.ip_address,
            a.user_agent,
            a.created_at,
            u.email AS user_email,
            u.role AS user_role
          FROM audit_logs a
          LEFT JOIN users u ON a.user_id = u.id
          ${where}
          ORDER BY a.created_at DESC
          LIMIT ? OFFSET ?
        `,
        [...params, Number(limit), Number(offset)]
      );

      const logs = rows.map((r) => ({
        ...r,
        old_values: r.old_values ? JSON.parse(r.old_values) : null,
        new_values: r.new_values ? JSON.parse(r.new_values) : null,
      }));

      return res.json({
        success: true,
        message: 'OK',
        data: {
          logs,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
      });
    } catch (err) {
      console.error('Audit logs list error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
    }
  }
);

// GET /api/audit-logs/:id - Detail (admin only)
router.get(
  '/:id',
  authenticateToken,
  requireAdmin,
  idParam,
  rejectInvalid,
  async (req, res) => {
    try {
      const [rows] = await db.query(
        `
          SELECT 
            a.*,
            u.email AS user_email,
            u.role AS user_role
          FROM audit_logs a
          LEFT JOIN users u ON a.user_id = u.id
          WHERE a.id = ?
          LIMIT 1
        `,
        [req.params.id]
      );

      if (!rows.length) {
        return res.status(404).json({ success: false, message: 'Audit log not found' });
      }

      const log = rows[0];
      log.old_values = log.old_values ? JSON.parse(log.old_values) : null;
      log.new_values = log.new_values ? JSON.parse(log.new_values) : null;

      return res.json({ success: true, message: 'OK', data: log });
    } catch (err) {
      console.error('Audit log detail error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch audit log' });
    }
  }
);

module.exports = router;
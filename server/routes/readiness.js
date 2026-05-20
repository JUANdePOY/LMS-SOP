const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/readiness
 * Overall readiness summary across all reservists.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM v_overall_readiness');
    const summary = rows[0] || {
      total_reservists: 0, active_reservists: 0, avg_readiness_score: 0,
      avg_training_participation: 0, avg_attendance_rate: 0, avg_active_status: 0,
      below_threshold_count: 0, high_readiness_count: 0, medium_readiness_count: 0, low_readiness_count: 0
    };

    res.json({ status: 'success', data: summary });
  } catch (error) {
    console.error('Error fetching overall readiness:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/readiness/reservists
 * Per-individual readiness scores with optional filtering.
 * Query params: squadron_id, group_id, arsen_id, is_active, search, sort_by, sort_order, page, limit
 */
router.get('/reservists', [
  query('squadron_id').optional().isInt(),
  query('group_id').optional().isInt(),
  query('arsen_id').optional().isInt(),
  query('is_active').optional().isBoolean().toBoolean(),
  query('search').optional().trim(),
  query('sort_by').optional().isIn(['readiness_score', 'training_participation_pct', 'attendance_rate_pct', 'last_name', 'rank']),
  query('sort_order').optional().isIn(['asc', 'desc']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const {
      squadron_id, group_id, arsen_id, is_active,
      search, sort_by = 'readiness_score', sort_order = 'desc',
      page = 1, limit = 25
    } = req.query;

    const conditions = [];
    const params = [];

    if (squadron_id) { conditions.push('vr.squadron_id = ?'); params.push(squadron_id); }
    if (group_id) { conditions.push('vr.group_id = ?'); params.push(group_id); }
    if (arsen_id) { conditions.push('vr.arsen_id = ?'); params.push(arsen_id); }
    if (is_active !== undefined) { conditions.push('vr.is_active = ?'); params.push(is_active); }
    if (search) {
      conditions.push('(vr.first_name LIKE ? OR vr.last_name LIKE ? OR vr.service_number LIKE ? OR vr.`rank` LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const allowedSort = {
      readiness_score: 'vr.readiness_score',
      training_participation_pct: 'vr.training_participation_pct',
      attendance_rate_pct: 'vr.attendance_rate_pct',
      last_name: 'vr.last_name',
      rank: 'vr.`rank`',
    };
    const sortCol = allowedSort[sort_by] || 'vr.readiness_score';
    const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC';

    const offset = (page - 1) * limit;

    const [countResult] = await db.query(`SELECT COUNT(*) as total FROM v_reservist_readiness vr ${where}`, params);
    const total = countResult[0].total;

    const [rows] = await db.query(
      `SELECT vr.* FROM v_reservist_readiness vr ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      status: 'success',
      data: rows,
      pagination: { total, page, limit, total_pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching reservist readiness:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/readiness/reservists/:id
 * Single reservist readiness detail with component breakdown.
 */
router.get('/reservists/:id', authenticateToken, async (req, res) => {
  try {
    const reservistId = req.params.id;

    const [readinessRows] = await db.query(
      'SELECT * FROM v_reservist_readiness WHERE reservist_id = ?',
      [reservistId]
    );

    if (readinessRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Reservist not found', code: 'NOT_FOUND' });
    }

    const [trainingRows] = await db.query(`
      SELECT t.id, t.title, t.start_datetime, t.end_datetime, t.is_mandatory, a.status
      FROM internal_training_participants itp
      JOIN trainings t ON itp.training_id = t.id
      LEFT JOIN attendance a ON a.training_id = t.id AND a.reservist_id = itp.reservist_id
      WHERE itp.reservist_id = ?
      ORDER BY t.start_datetime DESC
    `, [reservistId]);

    res.json({
      status: 'success',
      data: {
        ...readinessRows[0],
        training_history: trainingRows
      }
    });
  } catch (error) {
    console.error('Error fetching reservist readiness detail:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/readiness/squadrons
 * Squadron-level readiness aggregation.
 * Query params: group_id, arsen_id
 */
router.get('/squadrons', [
  query('group_id').optional().isInt(),
  query('arsen_id').optional().isInt(),
], authenticateToken, async (req, res) => {
  try {
    const { group_id, arsen_id } = req.query;
    const conditions = [];
    const params = [];

    if (group_id) { conditions.push('sr.group_id = ?'); params.push(group_id); }
    if (arsen_id) { conditions.push('sr.arsen_id = ?'); params.push(arsen_id); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.query(
      `SELECT sr.* FROM v_squadron_readiness sr ${where} ORDER BY sr.avg_readiness_score DESC`,
      params
    );

    res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('Error fetching squadron readiness:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/readiness/groups
 * Group-level readiness aggregation.
 * Query params: arsen_id
 */
router.get('/groups', [
  query('arsen_id').optional().isInt(),
], authenticateToken, async (req, res) => {
  try {
    const { arsen_id } = req.query;
    const conditions = [];
    const params = [];

    if (arsen_id) { conditions.push('gr.arsen_id = ?'); params.push(arsen_id); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.query(
      `SELECT gr.* FROM v_group_readiness gr ${where} ORDER BY gr.avg_readiness_score DESC`,
      params
    );

    res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('Error fetching group readiness:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/readiness/arsens
 * Arsen-level readiness aggregation.
 */
router.get('/arsens', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM v_arsen_readiness ORDER BY avg_readiness_score DESC'
    );
    res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('Error fetching arsen readiness:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/readiness/distribution
 * Readiness score distribution (buckets) for histogram/chart.
 * Query params: level (arsen|group|squadron|reservist), parent_id
 */
router.get('/distribution', [
  query('level').optional().isIn(['arsen', 'group', 'squadron', 'reservist']),
  query('parent_id').optional().isInt(),
], authenticateToken, async (req, res) => {
  try {
    const { level = 'arsen' } = req.query;

    let sql;
    switch (level) {
      case 'group':
        sql = `
          SELECT gr.group_id AS id, gr.group_name AS name, gr.avg_readiness_score AS score,
            gr.avg_training_participation, gr.avg_attendance_rate, gr.avg_active_status
          FROM v_group_readiness gr ORDER BY gr.avg_readiness_score DESC`;
        break;
      case 'squadron':
        sql = `
          SELECT sr.squadron_id AS id, sr.squadron_name AS name, sr.avg_readiness_score AS score,
            sr.avg_training_participation, sr.avg_attendance_rate, sr.avg_active_status
          FROM v_squadron_readiness sr ORDER BY sr.avg_readiness_score DESC`;
        break;
      case 'reservist':
        sql = `
          SELECT vr.reservist_id AS id, CONCAT(vr.last_name, ', ', vr.first_name) AS name,
            vr.readiness_score AS score, vr.training_participation_pct AS avg_training_participation,
            vr.attendance_rate_pct AS avg_attendance_rate, vr.active_status_pct AS avg_active_status
          FROM v_reservist_readiness vr ORDER BY vr.readiness_score DESC`;
        break;
      default:
        sql = `
          SELECT ar.arsen_id AS id, ar.arsen_name AS name, ar.avg_readiness_score AS score,
            ar.avg_training_participation, ar.avg_attendance_rate, ar.avg_active_status
          FROM v_arsen_readiness ar ORDER BY ar.avg_readiness_score DESC`;
    }

    const [rows] = await db.query(sql);

    // Build distribution buckets
    const buckets = [
      { label: '90-100', min: 90, max: 100, count: 0, color: '#10b981' },
      { label: '80-89',  min: 80, max: 89.99, count: 0, color: '#6366f1' },
      { label: '70-79',  min: 70, max: 79.99, count: 0, color: '#f59e0b' },
      { label: '60-69',  min: 60, max: 69.99, count: 0, color: '#f97316' },
      { label: '0-59',   min: 0,  max: 59.99, count: 0, color: '#ef4444' },
    ];

    rows.forEach(r => {
      const score = parseFloat(r.score) || 0;
      const bucket = buckets.find(b => score >= b.min && score <= b.max);
      if (bucket) bucket.count++;
    });

    res.json({
      status: 'success',
      data: {
        items: rows,
        distribution: buckets.filter(b => b.count > 0 || true)
      }
    });
  } catch (error) {
    console.error('Error fetching readiness distribution:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/readiness/trend
 * Readiness trend over time (monthly snapshots from training/attendance data).
 * Query params: reservist_id, squadron_id, group_id, arsen_id, months (default 6)
 */
router.get('/trend', [
  query('reservist_id').optional().isInt(),
  query('squadron_id').optional().isInt(),
  query('group_id').optional().isInt(),
  query('arsen_id').optional().isInt(),
  query('months').optional().isInt({ min: 1, max: 24 }).toInt(),
], authenticateToken, async (req, res) => {
  try {
    const { reservist_id, squadron_id, group_id, arsen_id, months = 6 } = req.query;

    // Build monthly attendance rate trend
    const conditions = [];
    const params = [];

    if (reservist_id) { conditions.push('a.reservist_id = ?'); params.push(reservist_id); }
    if (squadron_id) {
      conditions.push('ra.squadron_id = ?');
      params.push(squadron_id);
    }
    if (group_id) { conditions.push('ra.group_id = ?'); params.push(group_id); }
    if (arsen_id) {
      conditions.push('g.arsen_id = ?');
      params.push(arsen_id);
    }

    const joinAssignment = reservist_id ? '' : `
      JOIN reservist_assignments ra ON a.reservist_id = ra.reservist_id AND ra.is_primary = TRUE
      JOIN \`groups\` g ON ra.group_id = g.id
    `;

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.query(`
      SELECT
        DATE_FORMAT(a.created_at, '%Y-%m') AS month,
        COUNT(*) AS total_records,
        SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) AS present_count,
        ROUND(100.0 * SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS attendance_rate
      FROM attendance a
      ${joinAssignment}
      ${where}
      GROUP BY DATE_FORMAT(a.created_at, '%Y-%m')
      ORDER BY month DESC
      LIMIT ?
    `, [...params, months]);

    res.json({
      status: 'success',
      data: rows.reverse()
    });
  } catch (error) {
    console.error('Error fetching readiness trend:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

module.exports = router;

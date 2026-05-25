const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getUserScopeFilter } = require('../middleware/rbac');
const { logAudit } = require('../utils/auditLogger');

// Validation middleware
const validateArsen = [
  body('code').trim().notEmpty().withMessage('ARSEN code is required').isLength({ max: 50 }),
  body('name').trim().notEmpty().withMessage('ARSEN name is required').isLength({ max: 200 }),
  body('location').optional().trim().isLength({ max: 500 }),
  body('commander_name').optional().trim().isLength({ max: 200 })
];

const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')
];

// GET /api/arsens - List ARSENs with pagination, filtering by status, search
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('is_active').optional().isBoolean().toBoolean(),
  query('search').optional().trim().isLength({ max: 100 }),
  query('sort_by').optional().isIn(['name', 'code', 'created_at', 'updated_at']).trim()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 25;
    const offset = (page - 1) * limit;
    const { is_active, search, sort_by } = req.query;
    const sortBy = sort_by || 'name';

    let whereConditions = [];
    let queryParams = [];

    if (is_active !== undefined) {
      whereConditions.push('a.is_active = ?');
      queryParams.push(is_active);
    }

    if (search) {
      whereConditions.push('(a.code LIKE ? OR a.name LIKE ? OR a.location LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // For unit admins, enforce scope
    if (req.user.role !== 'admin') {
      const { conditions, params: scopeP } = getUserScopeFilter(req.user, { arsen: 'a.id' });
      if (conditions.length > 0) {
        whereConditions.push('(' + conditions.join(' OR ') + ')');
        queryParams.push(...scopeP);
      }
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM arsens a ${whereClause}`;
    const [countResult] = await db.query(countQuery, queryParams);
    const total = countResult[0].total;

    // Get ARSENs with group count
    const dataQuery = `
      SELECT 
        a.id,
        a.code,
        a.name,
        a.location,
        a.commander_name,
        a.is_active,
        a.created_at,
        a.updated_at,
        COUNT(DISTINCT g.id) as group_count
      FROM arsens a
      LEFT JOIN \`groups\` g ON a.id = g.arsen_id
      ${whereClause}
      GROUP BY a.id
      ORDER BY a.${sortBy} ASC
      LIMIT ? OFFSET ?
    `;

    const [arsens] = await db.query(dataQuery, [...queryParams, limit, offset]);

    res.json({
      status: 'success',
      data: arsens,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching ARSENs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/arsens/:id - Get single ARSEN details with statistics
router.get('/:id', validateId, authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    // Get ARSEN details with group count
    const [arsens] = await db.query(`
      SELECT 
        a.id,
        a.code,
        a.name,
        a.location,
        a.commander_name,
        a.is_active,
        a.created_at,
        a.updated_at,
        COUNT(DISTINCT g.id) as group_count
      FROM arsens a
      LEFT JOIN \`groups\` g ON a.id = g.arsen_id
      WHERE a.id = ?
      GROUP BY a.id
    `, [req.params.id]);

    if (arsens.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ARSEN not found',
        code: 'NOT_FOUND'
      });
    }

    const arsen = arsens[0];

    // Get statistics
    const [stats] = await db.query(`
      SELECT 
        COUNT(DISTINCT g.id) as total_groups,
        COUNT(DISTINCT s.id) as total_squadrons,
        COUNT(DISTINCT ra.reservist_id) as total_reservists
      FROM arsens a
      LEFT JOIN \`groups\` g ON a.id = g.arsen_id AND g.is_active = TRUE
       LEFT JOIN squadron s ON g.id = s.group_id AND s.is_active = TRUE
       LEFT JOIN reservist_assignments ra ON g.id = ra.group_id OR s.id = ra.squadron_id
      WHERE a.id = ?
    `, [req.params.id]);

    res.json({
      status: 'success',
      data: {
        ...arsen,
        statistics: stats[0]
      }
    });
  } catch (error) {
    console.error('Error fetching ARSEN:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/arsens - Create new ARSEN (admin only)
router.post('/', validateArsen, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const { code, name, location, commander_name } = req.body;

    // Check for duplicate code
    const [existingArsen] = await db.query(
      'SELECT id FROM arsens WHERE code = ?',
      [code]
    );

    if (existingArsen.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'ARSEN code already exists',
        code: 'DUPLICATE_CODE'
      });
    }

    const [result] = await db.query(
      'INSERT INTO arsens (code, name, location, commander_name) VALUES (?, ?, ?, ?)',
      [code, name, location || null, commander_name || null]
    );

    const [newArsen] = await db.query('SELECT * FROM arsens WHERE id = ?', [result.insertId]);

    // Log audit
    logAudit({
      user_id: req.user.id,
      action: 'arsen.created',
      entity_type: 'arsen',
      entity_id: result.insertId,
      new_values: newArsen[0],
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(201).json({
      status: 'success',
      data: newArsen[0]
    });
  } catch (error) {
    console.error('Error creating ARSEN:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/arsens/:id - Update ARSEN (admin only)
router.put('/:id', [...validateId, ...validateArsen], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const { code, name, location, commander_name } = req.body;

    // Get current ARSEN for audit
    const [currentArsen] = await db.query('SELECT * FROM arsens WHERE id = ?', [req.params.id]);

    if (currentArsen.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ARSEN not found',
        code: 'NOT_FOUND'
      });
    }

    // Check for duplicate code (excluding current record)
    const [duplicateCode] = await db.query(
      'SELECT id FROM arsens WHERE code = ? AND id != ?',
      [code, req.params.id]
    );

    if (duplicateCode.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'ARSEN code already exists',
        code: 'DUPLICATE_CODE'
      });
    }

    const [result] = await db.query(
      'UPDATE arsens SET code = ?, name = ?, location = ?, commander_name = ? WHERE id = ?',
      [code, name, location || null, commander_name || null, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ARSEN not found',
        code: 'NOT_FOUND'
      });
    }

    const [updatedArsen] = await db.query('SELECT * FROM arsens WHERE id = ?', [req.params.id]);

    // Log audit
    logAudit({
      user_id: req.user.id,
      action: 'arsen.updated',
      entity_type: 'arsen',
      entity_id: req.params.id,
      old_values: currentArsen[0],
      new_values: updatedArsen[0],
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      status: 'success',
      data: updatedArsen[0]
    });
  } catch (error) {
    console.error('Error updating ARSEN:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /api/arsens/:id - Soft delete ARSEN (admin only)
router.delete('/:id', validateId, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    // Get current ARSEN for audit
    const [currentArsen] = await db.query('SELECT * FROM arsens WHERE id = ? AND is_active = TRUE', [req.params.id]);

    if (currentArsen.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ARSEN not found or already inactive',
        code: 'NOT_FOUND'
      });
    }

    // Check if ARSEN has active groups
    const [activeGroups] = await db.query(
      'SELECT COUNT(*) as count FROM `groups` WHERE arsen_id = ? AND is_active = TRUE',
      [req.params.id]
    );

    if (activeGroups[0].count > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete ARSEN with active groups. Deactivate groups first.',
        code: 'HAS_ACTIVE_GROUPS'
      });
    }

    const [result] = await db.query(
      'UPDATE arsens SET is_active = FALSE WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ARSEN not found',
        code: 'NOT_FOUND'
      });
    }

    // Log audit
    logAudit({
      user_id: req.user.id,
      action: 'arsen.deleted',
      entity_type: 'arsen',
      entity_id: req.params.id,
      old_values: currentArsen[0],
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      status: 'success',
      message: 'ARSEN deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting ARSEN:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/arsens/:id/groups - Get groups belonging to ARSEN
router.get('/:id/groups', [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('is_active').optional().isBoolean().toBoolean(),
  query('search').optional().trim().isLength({ max: 100 })
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    // Check if ARSEN exists
    const [arsen] = await db.query('SELECT id FROM arsens WHERE id = ?', [req.params.id]);

    if (arsen.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ARSEN not found',
        code: 'NOT_FOUND'
      });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 25;
    const offset = (page - 1) * limit;
    const { is_active, search } = req.query;

    let whereConditions = ['g.arsen_id = ?'];
    let queryParams = [req.params.id];

    if (is_active !== undefined) {
      whereConditions.push('g.is_active = ?');
      queryParams.push(is_active);
    }

    if (search) {
      whereConditions.push('(g.code LIKE ? OR g.name LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM \`groups\` g ${whereClause}`;
    const [countResult] = await db.query(countQuery, queryParams);
    const total = countResult[0].total;

    // Get groups with squadron count
    const dataQuery = `
      SELECT 
        g.id,
        g.arsen_id,
        g.code,
        g.name,
        g.commander_name,
        g.is_active,
        g.created_at,
        g.updated_at,
        COUNT(DISTINCT s.id) as squadron_count
      FROM \`groups\` g
       LEFT JOIN squadron s ON g.id = s.group_id
      ${whereClause}
      GROUP BY g.id
      ORDER BY g.name ASC
      LIMIT ? OFFSET ?
    `;

    const [groups] = await db.query(dataQuery, [...queryParams, limit, offset]);

    res.json({
      status: 'success',
      data: groups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching ARSEN groups:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// Validation middleware
const validateGroup = [
  body('arsen_id').isInt({ min: 1 }).withMessage('ARSEN ID must be a positive integer'),
  body('code').trim().notEmpty().withMessage('Group code is required').isLength({ max: 50 }),
  body('name').trim().notEmpty().withMessage('Group name is required').isLength({ max: 200 }),
  body('commander_name').optional().trim().isLength({ max: 200 })
];

const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')
];

// GET /api/groups - List groups with pagination, filtering by arsen_id, status, search
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('arsen_id').optional().isInt({ min: 1 }).toInt(),
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
    const { arsen_id, is_active, search, sort_by } = req.query;
    const sortBy = sort_by || 'name';

    let whereConditions = [];
    let queryParams = [];

    if (arsen_id) {
      whereConditions.push('g.arsen_id = ?');
      queryParams.push(arsen_id);
    }

    if (is_active !== undefined) {
      whereConditions.push('g.is_active = ?');
      queryParams.push(is_active);
    }

    if (search) {
      whereConditions.push('(g.code LIKE ? OR g.name LIKE ? OR g.commander_name LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM \`groups\` g ${whereClause}`;
    const [countResult] = await db.query(countQuery, queryParams);
    const total = countResult[0].total;

    // Get groups with related data and squadron count
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
        a.name as arsen_name,
        a.code as arsen_code,
        COUNT(DISTINCT s.id) as squadron_count
      FROM \`groups\` g
      LEFT JOIN arsens a ON g.arsen_id = a.id
       LEFT JOIN squadron s ON g.id = s.group_id AND s.is_active = TRUE
      ${whereClause}
      GROUP BY g.id
      ORDER BY g.${sortBy} ASC
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
    console.error('Error fetching groups:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/groups/:id - Get single group details with statistics
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

    // Get group details with related ARSEN data
    const [groups] = await db.query(`
      SELECT 
        g.id,
        g.arsen_id,
        g.code,
        g.name,
        g.commander_name,
        g.is_active,
        g.created_at,
        g.updated_at,
        a.name as arsen_name,
        a.code as arsen_code
      FROM \`groups\` g
      LEFT JOIN arsens a ON g.arsen_id = a.id
      WHERE g.id = ?
    `, [req.params.id]);

    if (groups.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
        code: 'NOT_FOUND'
      });
    }

    const group = groups[0];

    // Get statistics (squadrons, assignments)
    const [stats] = await db.query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_squadrons,
        COUNT(DISTINCT ra.reservist_id) as total_reservists
      FROM \`groups\` g
       LEFT JOIN squadron s ON g.id = s.group_id AND s.is_active = TRUE
       LEFT JOIN reservist_assignments ra ON (g.id = ra.group_id OR s.id = ra.squadron_id)
      WHERE g.id = ?
    `, [req.params.id]);

    res.json({
      status: 'success',
      data: {
        ...group,
        statistics: stats[0]
      }
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/groups - Create new group (admin only)
router.post('/', validateGroup, authenticateToken, requireAdmin, async (req, res) => {
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

    const { arsen_id, code, name, commander_name } = req.body;

    // Verify ARSEN exists
    const [arsen] = await db.query('SELECT id FROM arsens WHERE id = ?', [arsen_id]);
    if (arsen.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ARSEN not found',
        code: 'ARSEN_NOT_FOUND'
      });
    }

    // Check for duplicate code within this ARSEN (unique constraint on arsen_id, code)
    const [existingGroup] = await db.query(
      'SELECT id FROM `groups` WHERE arsen_id = ? AND code = ?',
      [arsen_id, code]
    );

    if (existingGroup.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Group code already exists for this ARSEN',
        code: 'DUPLICATE_CODE'
      });
    }

    const [result] = await db.query(
      'INSERT INTO `groups` (arsen_id, code, name, commander_name) VALUES (?, ?, ?, ?)',
      [arsen_id, code, name, commander_name || null]
    );

    const [newGroup] = await db.query(`
      SELECT 
        g.*,
        a.name as arsen_name,
        a.code as arsen_code
      FROM \`groups\` g
      LEFT JOIN arsens a ON g.arsen_id = a.id
      WHERE g.id = ?
    `, [result.insertId]);

    // Log audit
    logAudit({
      user_id: req.user.id,
      action: 'group.created',
      entity_type: 'group',
      entity_id: result.insertId,
      new_values: newGroup[0],
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(201).json({
      status: 'success',
      data: newGroup[0]
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/groups/:id - Update group (admin only)
router.put('/:id', [...validateId, ...validateGroup], authenticateToken, requireAdmin, async (req, res) => {
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

    const { arsen_id, code, name, commander_name } = req.body;

    // Get current group for audit
    const [currentGroup] = await db.query('SELECT * FROM `groups` WHERE id = ?', [req.params.id]);

    if (currentGroup.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
        code: 'NOT_FOUND'
      });
    }

    // Verify ARSEN exists
    const [arsen] = await db.query('SELECT id FROM arsens WHERE id = ?', [arsen_id]);
    if (arsen.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ARSEN not found',
        code: 'ARSEN_NOT_FOUND'
      });
    }

    // Check for duplicate code within this ARSEN (excluding current record)
    const [duplicateCode] = await db.query(
      'SELECT id FROM `groups` WHERE arsen_id = ? AND code = ? AND id != ?',
      [arsen_id, code, req.params.id]
    );

    if (duplicateCode.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Group code already exists for this ARSEN',
        code: 'DUPLICATE_CODE'
      });
    }

    const [result] = await db.query(
      'UPDATE `groups` SET arsen_id = ?, code = ?, name = ?, commander_name = ? WHERE id = ?',
      [arsen_id, code, name, commander_name || null, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
        code: 'NOT_FOUND'
      });
    }

    const [updatedGroup] = await db.query(`
      SELECT 
        g.*,
        a.name as arsen_name,
        a.code as arsen_code
      FROM \`groups\` g
      LEFT JOIN arsens a ON g.arsen_id = a.id
      WHERE g.id = ?
    `, [req.params.id]);

    // Log audit
    logAudit({
      user_id: req.user.id,
      action: 'group.updated',
      entity_type: 'group',
      entity_id: req.params.id,
      old_values: currentGroup[0],
      new_values: updatedGroup[0],
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      status: 'success',
      data: updatedGroup[0]
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /api/groups/:id - Soft delete group (admin only)
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

    // Get current group for audit
    const [currentGroup] = await db.query('SELECT * FROM `groups` WHERE id = ? AND is_active = TRUE', [req.params.id]);

    if (currentGroup.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found or already inactive',
        code: 'NOT_FOUND'
      });
    }

    // Check if group has active squadrons or assignments
    const [activeResources] = await db.query(
      'SELECT COUNT(*) as count FROM squadron WHERE group_id = ? AND is_active = TRUE',
      [req.params.id]
    );

    if (activeResources[0].count > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete group with active squadrons. Deactivate squadrons first.',
        code: 'HAS_ACTIVE_SQUADRONS'
      });
    }

    const [result] = await db.query(
      'UPDATE `groups` SET is_active = FALSE WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
        code: 'NOT_FOUND'
      });
    }

    // Log audit
    logAudit({
      user_id: req.user.id,
      action: 'group.deleted',
      entity_type: 'group',
      entity_id: req.params.id,
      old_values: currentGroup[0],
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      status: 'success',
      message: 'Group deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/groups/:id/squadron - Get squadrons belonging to group
router.get('/:id/squadron', [
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

    // Verify group exists
    const [group] = await db.query('SELECT id FROM `groups` WHERE id = ?', [req.params.id]);
    if (group.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
        code: 'NOT_FOUND'
      });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 25;
    const offset = (page - 1) * limit;
    const { is_active, search } = req.query;

    let whereConditions = ['s.group_id = ?'];
    let queryParams = [req.params.id];

    if (is_active !== undefined) {
      whereConditions.push('s.is_active = ?');
      queryParams.push(is_active);
    }

    if (search) {
      whereConditions.push('(s.squadron_name LIKE ? OR s.location LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM squadron s ${whereClause}`;
    const [countResult] = await db.query(countQuery, queryParams);
    const total = countResult[0].total;

    // Get squadrons
    const dataQuery = `
      SELECT 
        s.id,
        s.group_id,
        s.squadron_name,
        s.location,
        s.is_active,
        s.created_at,
        s.updated_at
      FROM squadron s
      ${whereClause}
      ORDER BY s.squadron_name ASC
      LIMIT ? OFFSET ?
    `;

    const [squadrons] = await db.query(dataQuery, [...queryParams, limit, offset]);

    res.json({
      status: 'success',
      data: squadrons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching squadrons for group:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
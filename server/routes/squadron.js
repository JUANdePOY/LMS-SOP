const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// Validation middleware
const validateSquadron = [
  body('group_id').isInt({ min: 1 }).withMessage('Group ID must be a positive integer'),
  body('name').trim().notEmpty().withMessage('Squadron name is required').isLength({ max: 200 }),
  body('code').optional().trim().isLength({ max: 50 }),
  body('location').optional().trim().isLength({ max: 200 }),
  body('specialization').optional().trim().isLength({ max: 100 })
];

const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')
];

// GET /api/squadron - List squadrons with pagination and filtering
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('group_id').optional().isInt({ min: 1 }).toInt(),
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
    const { group_id, is_active, search, sort_by } = req.query;
    const sortBy = sort_by || 'name';

    let whereConditions = [];
    let queryParams = [];

    if (group_id) {
      whereConditions.push('s.group_id = ?');
      queryParams.push(group_id);
    }

    if (is_active !== undefined) {
      whereConditions.push('s.is_active = ?');
      queryParams.push(is_active);
    }

    if (search) {
      whereConditions.push('(s.name LIKE ? OR s.code LIKE ? OR s.location LIKE ? OR s.specialization LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM squadron s ${whereClause}`;
    const [countResult] = await db.query(countQuery, queryParams);
    const total = countResult[0].total;

    // Get squadrons with group and arsen names, plus member count
    const dataQuery = `
      SELECT 
        s.id,
        s.group_id,
        s.name,
        s.code,
        s.location,
        s.specialization,
        s.is_active,
        s.created_at,
        s.updated_at,
        g.name as group_name,
        g.code as group_code,
        a.name as arsen_name,
        a.code as arsen_code,
        (
          SELECT COUNT(DISTINCT ra.reservist_id)
          FROM reservist_assignments ra
          WHERE (ra.group_id = s.group_id OR ra.squadron_id = s.id)
        ) as members
      FROM squadron s
      LEFT JOIN \`groups\` g ON s.group_id = g.id
      LEFT JOIN arsens a ON g.arsen_id = a.id
      ${whereClause}
      ORDER BY s.${sortBy} ASC
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
    console.error('Error fetching squadrons:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/squadron/:id - Get single squadron
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

    const [squadrons] = await db.query(
      `SELECT 
        s.*,
        g.name as group_name,
        g.code as group_code,
        a.name as arsen_name,
        a.code as arsen_code,
        (
          SELECT COUNT(DISTINCT ra.reservist_id)
          FROM reservist_assignments ra
          WHERE (ra.group_id = s.group_id OR ra.squadron_id = s.id)
        ) as members
      FROM squadron s
      LEFT JOIN \`groups\` g ON s.group_id = g.id
      LEFT JOIN arsens a ON g.arsen_id = a.id
      WHERE s.id = ?`,
      [req.params.id]
    );

    if (squadrons.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Squadron not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      status: 'success',
      data: squadrons[0]
    });
  } catch (error) {
    console.error('Error fetching squadron:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/squadron - Create new squadron
router.post('/', [...validateSquadron, authenticateToken, requireAdmin], async (req, res) => {
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

    const { group_id, name, code, location, specialization } = req.body;

    // Verify group exists
    const [group] = await db.query(
      'SELECT g.id, a.id as arsen_id FROM \`groups\` g LEFT JOIN arsens a ON g.arsen_id = a.id WHERE g.id = ?',
      [group_id]
    );
    if (group.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    const [result] = await db.query(
      'INSERT INTO squadron (group_id, name, code, location, specialization) VALUES (?, ?, ?, ?, ?)',
      [group_id, name, code || null, location || null, specialization || null]
    );

    const [newSquadron] = await db.query(
      `SELECT 
        s.*,
        g.name as group_name,
        g.code as group_code,
        a.name as arsen_name,
        a.code as arsen_code,
        0 as members
      FROM squadron s
      LEFT JOIN \`groups\` g ON s.group_id = g.id
      LEFT JOIN arsens a ON g.arsen_id = a.id
      WHERE s.id = ?`,
      [result.insertId]
    );

    // Log audit
    logAudit({
      user_id: req.user.id,
      action: 'squadron.created',
      entity_type: 'squadron',
      entity_id: result.insertId,
      new_values: newSquadron[0],
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(201).json({
      status: 'success',
      data: newSquadron[0]
    });
  } catch (error) {
    console.error('Error creating squadron:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/squadron/:id - Update squadron
router.put('/:id', [...validateId, ...validateSquadron, authenticateToken, requireAdmin], async (req, res) => {
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

    const { group_id, name, code, location, specialization } = req.body;

    // Get current squadron for audit
    const [currentSquadron] = await db.query('SELECT * FROM squadron WHERE id = ?', [req.params.id]);

    if (currentSquadron.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Squadron not found',
        code: 'NOT_FOUND'
      });
    }

    // Verify group exists
    const [group] = await db.query('SELECT id FROM \`groups\` WHERE id = ?', [group_id]);
    if (group.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    const [result] = await db.query(
      'UPDATE squadron SET group_id = ?, name = ?, code = ?, location = ?, specialization = ? WHERE id = ?',
      [group_id, name, code || null, location || null, specialization || null, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Squadron not found',
        code: 'NOT_FOUND'
      });
    }

    const [updatedSquadron] = await db.query(
      `SELECT 
        s.*,
        g.name as group_name,
        g.code as group_code,
        a.name as arsen_name,
        a.code as arsen_code,
        (
          SELECT COUNT(DISTINCT ra.reservist_id)
          FROM reservist_assignments ra
          WHERE (ra.group_id = s.group_id OR ra.squadron_id = s.id)
        ) as members
      FROM squadron s
      LEFT JOIN \`groups\` g ON s.group_id = g.id
      LEFT JOIN arsens a ON g.arsen_id = a.id
      WHERE s.id = ?`,
      [req.params.id]
    );

    // Log audit
    logAudit({
      user_id: req.user.id,
      action: 'squadron.updated',
      entity_type: 'squadron',
      entity_id: req.params.id,
      old_values: currentSquadron[0],
      new_values: updatedSquadron[0],
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      status: 'success',
      data: updatedSquadron[0]
    });
  } catch (error) {
    console.error('Error updating squadron:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /api/squadron/:id - Soft delete squadron
router.delete('/:id', [...validateId, authenticateToken, requireAdmin], async (req, res) => {
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

    // Get current squadron for audit
    const [currentSquadron] = await db.query('SELECT * FROM squadron WHERE id = ? AND is_active = TRUE', [req.params.id]);

    if (currentSquadron.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Squadron not found or already inactive',
        code: 'NOT_FOUND'
      });
    }

    // Check if squadron has active assignments
    const [activeAssignments] = await db.query(
      'SELECT COUNT(*) as count FROM reservist_assignments WHERE squadron_id = ?',
      [req.params.id]
    );

    if (activeAssignments[0].count > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete squadron with active assignments. Reassign reservists first.',
        code: 'HAS_ASSIGNMENTS'
      });
    }

    const [result] = await db.query(
      'UPDATE squadron SET is_active = FALSE WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Squadron not found',
        code: 'NOT_FOUND'
      });
    }

    // Log audit
    logAudit({
      user_id: req.user.id,
      action: 'squadron.deleted',
      entity_type: 'squadron',
      entity_id: req.params.id,
      old_values: currentSquadron[0],
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      status: 'success',
      message: 'Squadron deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting squadron:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
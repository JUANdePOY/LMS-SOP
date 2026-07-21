const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authorizeManageEntity, attachCanManage, attachHierarchyScope } = require('../middleware/rbac');
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

// GET /api/squadron - List ALL squadrons (no longer scope-filtered/hidden).
// Every admin-tier user can see every squadron; can_manage reflects whether
// THIS user is allowed to edit/delete it.
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('group_id').optional().isInt({ min: 1 }).toInt(),
  query('is_active').optional().isBoolean(),
  query('search').optional().trim().isLength({ max: 100 }),
  query('sort_by').optional().isIn(['name', 'code', 'created_at', 'updated_at']).trim()
], authenticateToken, attachHierarchyScope(), async (req, res) => {
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

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const offset = (page - 1) * limit;
    const { group_id, is_active: is_active_raw, search, sort_by } = req.query;
    const is_active = is_active_raw !== undefined ? is_active_raw === 'true' : undefined;
    const sortBy = sort_by || 'name';

    let whereConditions = [];
    let queryParams = [];

    // group_id is a plain optional filter — still bounded by the caller's
    // own scope below.
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

    // Scoped visibility: admin_arsen sees every squadron under their ARSEN;
    // admin_group sees every squadron under their own Group; admin_squadron
    // only "owns" a single squadron. Full admin gets no filter.
    if (req.hierarchyScope) {
      if (req.user.role === 'admin_arsen') {
        whereConditions.push('g.arsen_id = ?');
        queryParams.push(req.hierarchyScope.arsen_id);
      } else if (req.user.role === 'admin_group') {
        whereConditions.push('s.group_id = ?');
        queryParams.push(req.hierarchyScope.group_id);
      } else {
        whereConditions.push('s.id = ?');
        queryParams.push(req.hierarchyScope.squadron_id);
      }
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count (need groups join to expose arsen_id for can_manage)
    const countQuery = `SELECT COUNT(*) as total FROM squadron s LEFT JOIN \`groups\` g ON s.group_id = g.id ${whereClause}`;
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
        g.arsen_id as arsen_id,
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

    const data = attachCanManage(
      squadrons,
      req.user,
      (row) => ({ arsen_id: row.arsen_id, group_id: row.group_id, squadron_id: row.id }),
      'squadron'
    );

    res.json({
      status: 'success',
      data,
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
router.get('/:id', validateId, authenticateToken, attachHierarchyScope(), async (req, res) => {
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

    // admin_squadron only owns one squadron — short-circuit before querying.
    if (req.hierarchyScope && req.user.role === 'admin_squadron' &&
        parseInt(req.params.id, 10) !== req.hierarchyScope.squadron_id) {
      return res.status(404).json({
        status: 'error',
        message: 'Squadron not found',
        code: 'NOT_FOUND'
      });
    }

    const [squadrons] = await db.query(
      `SELECT 
        s.*,
        g.name as group_name,
        g.code as group_code,
        g.arsen_id as arsen_id,
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

    // admin_arsen/admin_group: check the row's actual ancestry now that
    // we have it (their scope only tells us the ancestor id, not this
    // squadron's id ahead of time).
    if (req.hierarchyScope) {
      const row = squadrons[0];
      const outOfScope =
        (req.user.role === 'admin_arsen' && row.arsen_id !== req.hierarchyScope.arsen_id) ||
        (req.user.role === 'admin_group' && row.group_id !== req.hierarchyScope.group_id);
      if (outOfScope) {
        return res.status(404).json({
          status: 'error',
          message: 'Squadron not found',
          code: 'NOT_FOUND'
        });
      }
    }

    const data = attachCanManage(
      squadrons[0],
      req.user,
      (row) => ({ arsen_id: row.arsen_id, group_id: row.group_id, squadron_id: row.id }),
      'squadron'
    );

    res.json({
      status: 'success',
      data
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

// POST /api/squadron - Create new squadron.
// Full admin: anywhere. admin_arsen: under any group in their ARSEN.
// admin_group: only under their own Group. admin_squadron/reservist: blocked.
router.post(
  '/',
  validateSquadron,
  authenticateToken,
  authorizeManageEntity('squadron', {
    getNewParentScope: async (req, database) => {
      const groupId = Number(req.body.group_id);
      if (!groupId) return null;
      const [rows] = await database.query(
        'SELECT g.id, g.arsen_id FROM `groups` g WHERE g.id = ?',
        [groupId]
      );
      if (!rows.length) return null;
      return { arsen_id: rows[0].arsen_id, group_id: rows[0].id, squadron_id: null };
    }
  }),
  async (req, res) => {
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
  }
);

// PUT /api/squadron/:id - Update squadron.
// Full admin: any squadron. admin_arsen: squadrons in their ARSEN.
// admin_group: squadrons in their own Group. admin_squadron: blocked from
// editing the Squadron entity itself (they only manage reservists in it).
router.put(
  '/:id',
  [...validateId, ...validateSquadron],
  authenticateToken,
  authorizeManageEntity('squadron'),
  async (req, res) => {
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

      const { group_id, name, code, location, specialization, is_active } = req.body;

      // Get current squadron for audit
      const [currentSquadron] = await db.query('SELECT * FROM squadron WHERE id = ?', [req.params.id]);

      if (currentSquadron.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Squadron not found',
          code: 'NOT_FOUND'
        });
      }

      // If group_id is being changed, re-check the DESTINATION group is
      // within this admin's scope too (authorizeManageEntity only checked
      // the current/source group).
      if (Number(group_id) !== currentSquadron[0].group_id && req.user.role !== 'admin') {
        const { resolveEntityScope, userCanManageScope } = require('../middleware/rbac');
        const destScope = await resolveEntityScope('group', group_id, db);
        if (!destScope || !userCanManageScope(req.user, { ...destScope, squadron_id: null }, 'squadron')) {
          return res.status(403).json({
            status: 'error',
            message: 'Cannot move this squadron to a group outside your scope',
            code: 'OUT_OF_SCOPE'
          });
        }
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

      // Build dynamic SET clause so is_active is only updated when explicitly provided
      const setClauses = ['group_id = ?', 'name = ?', 'code = ?', 'location = ?', 'specialization = ?'];
      const params     = [group_id, name, code || null, location || null, specialization || null];
      if (is_active !== undefined) {
        setClauses.push('is_active = ?');
        params.push(is_active ? 1 : 0);
      }
      params.push(req.params.id);

      const [result] = await db.query(
        `UPDATE squadron SET ${setClauses.join(', ')} WHERE id = ?`,
        params
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
  }
);

// DELETE /api/squadron/:id - Soft delete squadron.
// Full admin: any squadron. admin_arsen: squadrons in their ARSEN.
// admin_group: squadrons in their own Group.
router.delete(
  '/:id',
  validateId,
  authenticateToken,
  authorizeManageEntity('squadron'),
  async (req, res) => {
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

      // Get current squadron (allow already-inactive for idempotent delete)
      const [currentSquadron] = await db.query('SELECT * FROM squadron WHERE id = ?', [req.params.id]);

      if (currentSquadron.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Squadron not found',
          code: 'NOT_FOUND'
        });
      }

      // Idempotent: if already soft-deleted, treat as success
      if (!currentSquadron[0].is_active) {
        return res.json({
          status: 'success',
          message: 'Squadron was already deactivated'
        });
      }

      // Check if squadron has active (current primary) assignments
      const [activeAssignments] = await db.query(
        'SELECT COUNT(*) as count FROM reservist_assignments WHERE squadron_id = ? AND is_primary = TRUE',
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
  }
);

module.exports = router;
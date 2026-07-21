const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authorizeManageEntity, attachCanManage, attachHierarchyScope } = require('../middleware/rbac');
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

// GET /api/groups - List ALL groups (no longer scope-filtered/hidden).
// Every admin-tier user can see every group; can_manage reflects whether
// THIS user is allowed to edit/delete it.
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('arsen_id').optional().isInt({ min: 1 }).toInt(),
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
    const { arsen_id, is_active: is_active_raw, search, sort_by } = req.query;
    const is_active = is_active_raw !== undefined ? is_active_raw === 'true' : undefined;
    const sortBy = sort_by || 'name';

    let whereConditions = [];
    let queryParams = [];

    // arsen_id is a plain optional filter — still bounded by the caller's
    // own scope below.
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

    // Scoped visibility: admin_arsen sees every group under their ARSEN;
    // admin_group/admin_squadron only "own" a single group (their ARSEN is
    // just read-only ancestor context), so they see only that one group.
    // Full admin (req.hierarchyScope === null) gets no filter.
    if (req.hierarchyScope) {
      if (req.user.role === 'admin_arsen') {
        whereConditions.push('g.arsen_id = ?');
        queryParams.push(req.hierarchyScope.arsen_id);
      } else {
        whereConditions.push('g.id = ?');
        queryParams.push(req.hierarchyScope.group_id);
      }
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

    const data = attachCanManage(
      groups,
      req.user,
      (row) => ({ arsen_id: row.arsen_id, group_id: row.id, squadron_id: null }),
      'group'
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
    console.error('Error fetching groups:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/groups/:id - Get single group details with statistics
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

    // Scoped admins outside this group/ARSEN: if not in scope, treat as
    // not found before doing any further work — but admin_arsen needs the
    // row's arsen_id first, so a quick non-scope-filtered fetch narrows
    // that down here without exposing the fuller detail query below.
    if (req.hierarchyScope && req.user.role !== 'admin_arsen') {
      if (parseInt(req.params.id, 10) !== req.hierarchyScope.group_id) {
        return res.status(404).json({
          status: 'error',
          message: 'Group not found',
          code: 'NOT_FOUND'
        });
      }
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

    if (req.hierarchyScope && req.user.role === 'admin_arsen' && group.arsen_id !== req.hierarchyScope.arsen_id) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
        code: 'NOT_FOUND'
      });
    }

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

    const data = attachCanManage(
      { ...group, statistics: stats[0] },
      req.user,
      (row) => ({ arsen_id: row.arsen_id, group_id: row.id, squadron_id: null }),
      'group'
    );

    res.json({
      status: 'success',
      data
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

// POST /api/groups - Create new group.
// Full admin: anywhere. admin_arsen: only under their own ARSEN.
// admin_group/admin_squadron/reservist: blocked (they don't manage groups).
router.post(
  '/',
  validateGroup,
  authenticateToken,
  authorizeManageEntity('group', {
    getNewParentScope: async (req, database) => {
      const arsenId = Number(req.body.arsen_id);
      if (!arsenId) return null;
      const [rows] = await database.query('SELECT id FROM arsens WHERE id = ?', [arsenId]);
      if (!rows.length) return null;
      return { arsen_id: arsenId, group_id: null, squadron_id: null };
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

      const { arsen_id, code, name, commander_name } = req.body;

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
  }
);

// PUT /api/groups/:id - Update group.
// Full admin: any group. admin_arsen: only groups under their own ARSEN.
// admin_group/admin_squadron: blocked from editing the Group entity itself.
router.put(
  '/:id',
  [...validateId, ...validateGroup],
  authenticateToken,
  authorizeManageEntity('group'),
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

      const { arsen_id, code, name, commander_name, is_active } = req.body;

      // Get current group for audit
      const [currentGroup] = await db.query('SELECT * FROM `groups` WHERE id = ?', [req.params.id]);

      if (currentGroup.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Group not found',
          code: 'NOT_FOUND'
        });
      }

      // If arsen_id is being changed, an admin_arsen must also own the
      // DESTINATION arsen — not just the current one (already checked by
      // authorizeManageEntity). Re-validate here for the target.
      const { userCanManageScope } = require('../middleware/rbac');
      if (Number(arsen_id) !== currentGroup[0].arsen_id && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Cannot move this group to a different ARSEN outside your scope',
          code: 'OUT_OF_SCOPE'
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

      // Build dynamic SET clause so is_active is only updated when explicitly provided,
      // matching the same pattern used in arsens.js
      const setClauses = ['arsen_id = ?', 'code = ?', 'name = ?', 'commander_name = ?'];
      const params     = [arsen_id, code, name, commander_name || null];
      if (is_active !== undefined) {
        setClauses.push('is_active = ?');
        params.push(is_active ? 1 : 0);
      }
      params.push(req.params.id);

      const [result] = await db.query(
        `UPDATE \`groups\` SET ${setClauses.join(', ')} WHERE id = ?`,
        params
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
  }
);

// DELETE /api/groups/:id - Soft delete group.
// Full admin: any group. admin_arsen: only groups under their own ARSEN.
router.delete(
  '/:id',
  validateId,
  authenticateToken,
  authorizeManageEntity('group'),
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

      // Get current group (allow already-inactive for idempotent delete)
      const [currentGroup] = await db.query('SELECT * FROM `groups` WHERE id = ?', [req.params.id]);

      if (currentGroup.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Group not found',
          code: 'NOT_FOUND'
        });
      }

      // Idempotent: if already soft-deleted, treat as success
      if (!currentGroup[0].is_active) {
        return res.json({
          status: 'success',
          message: 'Group was already deactivated'
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
  }
);

// GET /api/groups/:id/squadron - Get squadrons belonging to group
router.get('/:id/squadron', [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('is_active').optional().isBoolean(),
  query('search').optional().trim().isLength({ max: 100 })
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

    // Verify group exists
    const [group] = await db.query('SELECT id, arsen_id FROM `groups` WHERE id = ?', [req.params.id]);
    if (group.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
        code: 'NOT_FOUND'
      });
    }

    // Scoped visibility: admin_arsen may drill into any group under their
    // ARSEN; admin_group/admin_squadron only into their own single group.
    if (req.hierarchyScope) {
      const outOfScope = req.user.role === 'admin_arsen'
        ? group[0].arsen_id !== req.hierarchyScope.arsen_id
        : parseInt(req.params.id, 10) !== req.hierarchyScope.group_id;
      if (outOfScope) {
        return res.status(404).json({
          status: 'error',
          message: 'Group not found',
          code: 'NOT_FOUND'
        });
      }
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const offset = (page - 1) * limit;
    const { is_active: is_active_raw, search } = req.query;
    const is_active = is_active_raw !== undefined ? is_active_raw === 'true' : undefined;

    let whereConditions = ['s.group_id = ?'];
    let queryParams = [req.params.id];

    // admin_squadron only "owns" one squadron within this group — narrow
    // the squadron list itself down to just that squadron.
    if (req.hierarchyScope && req.user.role === 'admin_squadron') {
      whereConditions.push('s.id = ?');
      queryParams.push(req.hierarchyScope.squadron_id);
    }

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
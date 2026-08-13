const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requireSuperAdmin, requireAdmin } = require('../middleware/auth');
const { requireBusinessScope } = require('../middleware/scope');
const { logAudit } = require('../utils/auditLogger');
const departmentModel = require('../models/departmentModel');

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    let effectiveBusinessId = undefined;
    let effectiveDepartmentId = undefined;

    if (req.user.role === 'department_head') {
      if (!req.user.department_id) {
        return res.status(403).json({ status: 'error', message: 'No department assigned', code: 'NO_DEPARTMENT_SCOPE' });
      }
      effectiveDepartmentId = req.user.department_id;
    } else if (req.user.role !== 'super_admin') {
      if (!req.user.business_id) {
        return res.status(403).json({ status: 'error', message: 'No business scope assigned', code: 'NO_BUSINESS_SCOPE' });
      }
      effectiveBusinessId = req.user.business_id;
    }

    const { search, status, page = 1, limit = 50 } = req.query;
    const result = await departmentModel.findAll({
      search: search || undefined,
      status: status || undefined,
      business_id: effectiveBusinessId,
      department_id: effectiveDepartmentId,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    console.error('Departments list error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch departments', code: 'DB_ERROR' });
  }
});

router.get('/hierarchy', async (req, res) => {
  try {
    const hierarchy = await departmentModel.getHierarchy();
    res.json({ status: 'success', data: hierarchy });
  } catch (err) {
    console.error('Department hierarchy error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch department hierarchy', code: 'DB_ERROR' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const department = await departmentModel.findById(parseInt(req.params.id));
    if (!department) {
      return res.status(404).json({ status: 'error', message: 'Department not found', code: 'NOT_FOUND' });
    }
    res.json({ status: 'success', data: department });
  } catch (err) {
    console.error('Department fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch department', code: 'DB_ERROR' });
  }
});

router.post('/', [
  body('name').trim().isLength({ min: 2 }).withMessage('Department name is required'),
  body('code').trim().isLength({ min: 2 }).withMessage('Department code is required'),
  body('description').optional().trim(),
  body('parent_department_id').optional({ nullable: true }).isInt(),
  body('head_user_id').optional({ nullable: true }).isInt(),
  body('business_id').optional({ nullable: true }).isInt().withMessage('Business ID must be an integer'),
  body('status').optional().isIn(['active', 'inactive', 'archived']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Admin access required', code: 'ADMIN_REQUIRED' });
    }

    const { name, code, description, parent_department_id, head_user_id, business_id, status } = req.body;

    let finalBusinessId = business_id ? parseInt(business_id) : null;
    if (req.user.role !== 'super_admin') {
      if (!req.user.business_id) {
        return res.status(403).json({ status: 'error', message: 'No business scope assigned', code: 'NO_BUSINESS_SCOPE' });
      }
      if (finalBusinessId && finalBusinessId !== req.user.business_id) {
        return res.status(403).json({ status: 'error', message: 'Cannot create departments in another business', code: 'BUSINESS_SCOPE_DENIED' });
      }
      finalBusinessId = req.user.business_id;
    }

    const existing = await departmentModel.findByCode(code);
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Department code already exists', code: 'CODE_EXISTS' });
    }

    const departmentId = await departmentModel.create({ name, code, description, parent_department_id, head_user_id, business_id: finalBusinessId, status });

    logAudit({
      user_id: req.user.id,
      action: 'department.created',
      entity_type: 'department',
      entity_id: departmentId,
      new_values: { name, code, business_id: finalBusinessId }
    });

    res.status(201).json({ status: 'success', message: 'Department created successfully', data: { id: departmentId, name, code } });
  } catch (err) {
    console.error('Department create error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create department', code: 'DB_ERROR' });
  }
});

router.put('/:id', [
  body('name').optional().trim().isLength({ min: 2 }),
  body('code').optional().trim().isLength({ min: 2 }),
  body('description').optional().trim(),
  body('parent_department_id').optional({ nullable: true }).isInt(),
  body('head_user_id').optional({ nullable: true }).isInt(),
  body('business_id').optional({ nullable: true }).isInt().withMessage('Business ID must be an integer'),
  body('status').optional().isIn(['active', 'inactive', 'archived']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const departmentId = parseInt(req.params.id);
    const targetDept = await departmentModel.findById(departmentId);
    if (!targetDept) {
      return res.status(404).json({ status: 'error', message: 'Department not found', code: 'NOT_FOUND' });
    }

    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Admin access required', code: 'ADMIN_REQUIRED' });
    }

    if (req.user.role !== 'super_admin' && req.user.business_id !== targetDept.business_id) {
      return res.status(403).json({ status: 'error', message: 'Cannot update departments outside your business', code: 'BUSINESS_SCOPE_DENIED' });
    }

    const updates = {};
    const allowed = ['name', 'code', 'description', 'parent_department_id', 'head_user_id', 'business_id', 'status'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (req.user.role !== 'super_admin') {
      if (updates.business_id !== undefined && updates.business_id !== null && updates.business_id !== req.user.business_id) {
        return res.status(403).json({ status: 'error', message: 'Cannot move departments to another business', code: 'BUSINESS_SCOPE_DENIED' });
      }
      updates.business_id = req.user.business_id;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No changes provided', code: 'VALIDATION_ERROR' });
    }

    await departmentModel.update(departmentId, updates);

    logAudit({
      user_id: req.user.id,
      action: 'department.updated',
      entity_type: 'department',
      entity_id: departmentId,
      new_values: updates
    });

    res.json({ status: 'success', message: 'Department updated successfully' });
  } catch (err) {
    console.error('Department update error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update department', code: 'DB_ERROR' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);

    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ status: 'error', message: 'Only super admins can delete departments', code: 'ADMIN_ONLY' });
    }

    const targetDept = await departmentModel.findById(departmentId);
    if (!targetDept) {
      return res.status(404).json({ status: 'error', message: 'Department not found', code: 'NOT_FOUND' });
    }

    const force = req.query.force === 'true' || req.body?.force === true;
    await departmentModel.remove(departmentId, force);

    logAudit({
      user_id: req.user.id,
      action: 'department.deleted',
      entity_type: 'department',
      entity_id: departmentId,
      old_values: { name: targetDept.name, code: targetDept.code, forced: force }
    });

    res.json({ status: 'success', message: 'Department deleted successfully' });
  } catch (err) {
    console.error('Department delete error:', err);
    if (err.code === 'HAS_DEPENDENCIES') {
      return res.status(409).json({ status: 'error', message: err.message, code: 'HAS_DEPENDENCIES' });
    }
    res.status(500).json({ status: 'error', message: 'Failed to delete department', code: 'DB_ERROR' });
  }
});

router.get('/:id/users', async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);
    const users = await departmentModel.getUsers(departmentId);
    res.json({ status: 'success', data: users });
  } catch (err) {
    console.error('Department users error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch department users', code: 'DB_ERROR' });
  }
});

// GET /api/departments/:id/scope-grants
router.get('/:id/scope-grants', requireAdmin, async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);
    const targetDept = await departmentModel.findById(departmentId);
    if (!targetDept) {
      return res.status(404).json({ status: 'error', message: 'Department not found', code: 'NOT_FOUND' });
    }

    if (req.user.role !== 'super_admin' && req.user.business_id !== targetDept.business_id) {
      return res.status(403).json({ status: 'error', message: 'Access denied to this department', code: 'BUSINESS_SCOPE_DENIED' });
    }

    const [grants] = await db.query(
      `SELECT dsg.id, dsg.user_id, u.full_name, u.email, u.role, dsg.granted_by, dsg.granted_at
       FROM department_scope_grants dsg
       INNER JOIN users u ON u.id = dsg.user_id
       WHERE dsg.department_id = ?
       ORDER BY u.full_name ASC`,
      [departmentId]
    );
    res.json({ status: 'success', data: grants });
  } catch (err) {
    console.error('Department scope grants error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch scope grants', code: 'DB_ERROR' });
  }
});

// PUT /api/departments/:id/scope-grants
router.put('/:id/scope-grants', requireAdmin, [
  body('user_ids').optional().isArray().withMessage('user_ids must be an array'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const departmentId = parseInt(req.params.id);
    const targetDept = await departmentModel.findById(departmentId);
    if (!targetDept) {
      return res.status(404).json({ status: 'error', message: 'Department not found', code: 'NOT_FOUND' });
    }

    if (req.user.role !== 'super_admin' && req.user.business_id !== targetDept.business_id) {
      return res.status(403).json({ status: 'error', message: 'Cannot manage scope for another business', code: 'BUSINESS_SCOPE_DENIED' });
    }

    const userIds = (req.body.user_ids || []).map(id => parseInt(id, 10)).filter(id => !isNaN(id));

    await db.query('DELETE FROM department_scope_grants WHERE department_id = ?', [departmentId]);

    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '(?, ?, ?)').join(',');
      const values = [];
      userIds.forEach(uid => {
        values.push(uid, departmentId, req.user.id);
      });
      await db.query(
        `INSERT INTO department_scope_grants (user_id, department_id, granted_by) VALUES ${placeholders}`,
        values
      );
    }

    logAudit({
      user_id: req.user.id,
      action: 'department.scope_grants_updated',
      entity_type: 'department',
      entity_id: departmentId,
      new_values: { granted_user_ids: userIds }
    });

    res.json({ status: 'success', message: 'Department scope grants updated' });
  } catch (err) {
    console.error('Department scope grants update error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update scope grants', code: 'DB_ERROR' });
  }
});

module.exports = router;
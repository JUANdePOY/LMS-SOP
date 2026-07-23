const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requireSuperAdmin, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const departmentModel = require('../models/departmentModel');

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const result = await departmentModel.findAll({
      search: search || undefined,
      status: status || undefined,
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
  body('parent_department_id').optional().isInt(),
  body('head_user_id').optional().isInt(),
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

    const { name, code, description, parent_department_id, head_user_id, status } = req.body;

    const existing = await departmentModel.findByCode(code);
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Department code already exists', code: 'CODE_EXISTS' });
    }

    const departmentId = await departmentModel.create({ name, code, description, parent_department_id, head_user_id, status });

    logAudit({
      user_id: req.user.id,
      action: 'department.created',
      entity_type: 'department',
      entity_id: departmentId,
      new_values: { name, code }
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
  body('parent_department_id').optional().isInt(),
  body('head_user_id').optional().isInt(),
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

    const updates = {};
    const allowed = ['name', 'code', 'description', 'parent_department_id', 'head_user_id', 'status'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
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

    await departmentModel.remove(departmentId);

    logAudit({
      user_id: req.user.id,
      action: 'department.deleted',
      entity_type: 'department',
      entity_id: departmentId,
      old_values: { name: targetDept.name, code: targetDept.code }
    });

    res.json({ status: 'success', message: 'Department deleted successfully' });
  } catch (err) {
    console.error('Department delete error:', err);
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

module.exports = router;
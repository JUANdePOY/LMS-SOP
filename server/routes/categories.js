const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const categoryModel = require('../models/categoryModel');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    let effectiveDepartmentId = undefined;
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      if (!req.user.business_id) {
        return res.status(403).json({ status: 'error', message: 'No business scope assigned', code: 'NO_BUSINESS_SCOPE' });
      }
      const deptIds = req.user.scoped_department_ids || (req.user.department_id ? [req.user.department_id] : []);
      if (!deptIds.length) {
        return res.status(403).json({ status: 'error', message: 'No department scope assigned', code: 'NO_DEPT_SCOPE' });
      }
      effectiveDepartmentId = deptIds[0];
    }

    const { search, department_id, page = 1, limit = 50 } = req.query;
    let finalDeptId = department_id ? parseInt(department_id, 10) : effectiveDepartmentId;
    
    const result = await categoryModel.findAll({
      search: search || undefined,
      department_id: finalDeptId,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    console.error('Categories list error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch categories', code: 'DB_ERROR' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id, 10);
    const category = await categoryModel.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: 'error', message: 'Category not found', code: 'NOT_FOUND' });
    }

    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      const allowedDepts = req.user.scoped_department_ids || (req.user.department_id ? [req.user.department_id] : []);
      if (!allowedDepts.includes(category.department_id)) {
        return res.status(403).json({ status: 'error', message: 'Access denied to this category', code: 'DEPT_SCOPE_DENIED' });
      }
    }

    res.json({ status: 'success', data: category });
  } catch (err) {
    console.error('Category fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch category', code: 'DB_ERROR' });
  }
});

router.post('/', requireAdmin, [
  body('name').trim().isLength({ min: 2 }).withMessage('Category name is required'),
  body('department_id').isInt().withMessage('Department ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    // A single lookup that also considers soft-deleted rows: the unique key
    // still reserves the (department_id, name) pair for trashed categories, so
    // detecting them here lets us return a clear, actionable conflict instead of
    // a raw database error.
    const duplicate = await categoryModel.findByName(
      req.body.name,
      req.body.department_id,
      { includeDeleted: true }
    );
    if (duplicate) {
      const inTrash = duplicate.deleted_at != null;
      const message = inTrash
        ? `A category named "${req.body.name}" already exists in this department (it may be in the trash). Restore it or use a different name.`
        : `A category named "${req.body.name}" already exists in this department.`;
      return res.status(409).json({ status: 'error', message, code: 'CODE_EXISTS' });
    }

    const categoryData = {
      name: req.body.name,
      department_id: req.body.department_id,
      description: req.body.description || null,
      created_by: req.user.id,
    };

    const id = await categoryModel.create(categoryData);

    logAudit({
      user_id: req.user.id,
      action: 'category.created',
      entity_type: 'category',
      entity_id: id,
      metadata: { name: req.body.name, department_id: req.body.department_id },
    });

    res.status(201).json({ status: 'success', message: 'Category created successfully', data: { id, ...categoryData } });
  } catch (err) {
    // Defense-in-depth: if a concurrent insert or a missed pre-check slips a
    // duplicate through, never leak the raw database error — return a clean
    // conflict. (mysql2 sets err.code = 'ER_DUP_ENTRY'.)
    if (err.code === 'ER_DUP_ENTRY' || err.code === 'CODE_EXISTS') {
      return res.status(409).json({
        status: 'error',
        message: `A category named "${req.body?.name || 'this name'}" already exists in this department.`,
        code: 'CODE_EXISTS',
      });
    }
    console.error('Category create error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create category', code: 'DB_ERROR' });
  }
});

router.put('/:id', requireAdmin, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('description').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const updates = {};
    ['name', 'description', 'department_id'].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No changes provided', code: 'VALIDATION_ERROR' });
    }

    await categoryModel.update(parseInt(req.params.id, 10), updates);

    logAudit({
      user_id: req.user.id,
      action: 'category.updated',
      entity_type: 'category',
      entity_id: req.params.id,
      metadata: updates,
    });

    res.json({ status: 'success', message: 'Category updated successfully' });
  } catch (err) {
    console.error('Category update error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update category', code: 'DB_ERROR' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const category = await categoryModel.findById(parseInt(req.params.id, 10));
    if (!category) {
      return res.status(404).json({ status: 'error', message: 'Category not found', code: 'NOT_FOUND' });
    }

    const force = req.query.force === 'true' || req.body?.force === true;
    if (force && req.user.role !== 'super_admin') {
      return res.status(403).json({ status: 'error', message: 'Only super admins can force delete categories', code: 'ADMIN_ONLY' });
    }
    await categoryModel.softDelete(parseInt(req.params.id, 10), force);

    logAudit({
      user_id: req.user.id,
      action: 'category.deleted',
      entity_type: 'category',
      entity_id: req.params.id,
      metadata: { name: category.name, forced: force },
    });

    res.json({ status: 'success', message: 'Category deleted successfully' });
  } catch (err) {
    if (err.code === 'HAS_DEPENDENCIES') {
      return res.status(409).json({ status: 'error', message: err.message, code: 'HAS_DEPENDENCIES' });
    }
    console.error('Category delete error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete category', code: 'DB_ERROR' });
  }
});

module.exports = router;
const express = require('express');
const { body, validationResult } = require('express-validator');
const sopr = require('../models/sopModel');
const sopVersionModel = require('../models/sopVersionModel');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { generateSopCode } = require('../utils/sopUtils');

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const result = await sopr.findAll({
      search: req.query.search,
      status: req.query.status,
      department_id: req.query.department_id ? parseInt(req.query.department_id, 10) : undefined,
      category_id: req.query.category_id ? parseInt(req.query.category_id, 10) : undefined,
      page: parseInt(req.query.page || '1', 10),
      limit: parseInt(req.query.limit || '20', 10),
    });
    res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('List SOPs error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch SOPs', code: 'DB_ERROR' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    // sops uses `deleted_at`, not `is_deleted` — the old is_deleted filter
    // referenced a column that doesn't exist on this table.
    const [rows] = await require('../config/database').query(`
      SELECT status, COUNT(*) AS count
      FROM sops
      WHERE deleted_at IS NULL
      GROUP BY status
    `);
    res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('SOP stats error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch SOP stats', code: 'DB_ERROR' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sop = await sopr.findById(parseInt(req.params.id, 10));
    if (!sop) {
      return res.status(404).json({ status: 'error', message: 'SOP not found', code: 'NOT_FOUND' });
    }
    res.json({ status: 'success', data: sop });
  } catch (error) {
    console.error('Fetch SOP error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch SOP', code: 'DB_ERROR' });
  }
});

router.post('/', [
  body('title').trim().isLength({ min: 2 }).withMessage('Title is required'),
  body('description').optional({ values: 'falsy' }).trim(),
  body('department_id').isInt().withMessage('Department is required'),
  body('category_id').optional().isInt(),
  body('status').optional().isIn(['Draft', 'For Review', 'Approved', 'Published', 'Archived']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.role !== 'department_head') {
      return res.status(403).json({ status: 'error', message: 'Admin access required', code: 'ADMIN_REQUIRED' });
    }

    const { title, description, department_id, category_id, status, version } = req.body;
    const code = req.body.code || generateSopCode(title);

    const existing = await sopr.findByCode(code);
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'SOP code already exists', code: 'CODE_EXISTS' });
    }

    const id = await sopr.create({
      title,
      code,
      description,
      department_id,
      category_id,
      owner_user_id: req.user.id,
      status: status || 'Draft',
      version: version || '1.0',
    });

    // Content (sections, steps, documents, acknowledgements, assignments)
    // all hang off a sop_versions row, so a SOP needs one from the start
    // or every content-creation call downstream has to create it lazily.
    await sopVersionModel.createVersion({
      sop_id: id,
      version: version || '1.0',
      status: status || 'Draft',
      created_by: req.user.id,
    }, { makeCurrent: true });

    logAudit({
      user_id: req.user.id,
      action: 'sop.created',
      entity_type: 'sop',
      entity_id: id,
      metadata: { title, code, status: status || 'Draft' },
    });

    res.status(201).json({ status: 'success', message: 'SOP created successfully', data: { id, title, code, status: status || 'Draft' } });
  } catch (error) {
    console.error('Create SOP error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create SOP', code: 'DB_ERROR' });
  }
});

router.put('/:id', [
  body('title').optional().trim().isLength({ min: 2 }),
  body('description').optional({ values: 'falsy' }).trim(),
  body('department_id').optional().isInt(),
  body('category_id').optional().isInt(),
  body('status').optional().isIn(['Draft', 'For Review', 'Approved', 'Published', 'Archived']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const sopId = parseInt(req.params.id, 10);
    const existing = await sopr.findById(sopId);
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'SOP not found', code: 'NOT_FOUND' });
    }

    const updates = {};
    // `metadata` is intentionally left out here — sopModel.update() drops it
    // silently now, but there's no column for it on either schema variant.
    ['title', 'description', 'department_id', 'category_id', 'status', 'version'].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No changes provided', code: 'VALIDATION_ERROR' });
    }

    if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.role !== 'department_head') {
      return res.status(403).json({ status: 'error', message: 'Admin access required', code: 'ADMIN_REQUIRED' });
    }

    await sopr.update(sopId, updates);

    logAudit({
      user_id: req.user.id,
      action: 'sop.updated',
      entity_type: 'sop',
      entity_id: sopId,
      metadata: updates,
    });

    res.json({ status: 'success', message: 'SOP updated successfully' });
  } catch (error) {
    console.error('Update SOP error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update SOP', code: 'DB_ERROR' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const sopId = parseInt(req.params.id, 10);
    const existing = await sopr.findById(sopId);
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'SOP not found', code: 'NOT_FOUND' });
    }

    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Admin access required', code: 'ADMIN_REQUIRED' });
    }

    await sopr.softDelete(sopId);

    logAudit({
      user_id: req.user.id,
      action: 'sop.deleted',
      entity_type: 'sop',
      entity_id: sopId,
      metadata: { title: existing.title },
    });

    res.json({ status: 'success', message: 'SOP deleted successfully' });
  } catch (error) {
    console.error('Delete SOP error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete SOP', code: 'DB_ERROR' });
  }
});

module.exports = router;
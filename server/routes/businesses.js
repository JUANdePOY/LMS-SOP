const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const businessModel = require('../models/businessModel');
const { upload } = require('../middleware/businessUpload');

const router = express.Router();

router.use(authenticateToken);

// GET /api/businesses
router.get('/', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const result = await businessModel.findAll({
      search: search || undefined,
      status: status || undefined,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    console.error('Businesses list error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch businesses', code: 'DB_ERROR' });
  }
});

// GET /api/businesses/hierarchy
router.get('/hierarchy', async (req, res) => {
  try {
    const hierarchy = await businessModel.getHierarchy();
    res.json({ status: 'success', data: hierarchy });
  } catch (err) {
    console.error('Business hierarchy error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch hierarchy', code: 'DB_ERROR' });
  }
});

// GET /api/businesses/:id
router.get('/:id', async (req, res) => {
  try {
    const business = await businessModel.findById(parseInt(req.params.id));
    if (!business) {
      return res.status(404).json({ status: 'error', message: 'Business not found', code: 'NOT_FOUND' });
    }
    res.json({ status: 'success', data: business });
  } catch (err) {
    console.error('Business fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch business', code: 'DB_ERROR' });
  }
});

// POST /api/businesses/upload-logo
router.post('/upload-logo', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded', code: 'VALIDATION_ERROR' });
    }
    const relativePath = require('path').relative(require('path').join(__dirname, '..'), req.file.path).replace(/\\/g, '/');
    const logoUrl = `/api/${relativePath}`;
    res.status(201).json({
      status: 'success',
      message: 'Logo uploaded successfully',
      data: { logo_url: logoUrl, file_name: req.file.filename },
    });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to upload logo', code: 'UPLOAD_ERROR' });
  }
});

// POST /api/businesses
router.post('/', [
  body('business_code').trim().isLength({ min: 2 }).withMessage('Business code is required'),
  body('business_name').trim().isLength({ min: 2 }).withMessage('Business name is required'),
  body('description').optional().trim(),
  body('logo_url').optional().trim(),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('status').optional().isIn(['active', 'inactive']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Admin access required', code: 'ADMIN_REQUIRED' });
    }

    const { business_code } = req.body;
    const existing = await businessModel.findByCode(business_code);
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Business code already exists', code: 'CODE_EXISTS' });
    }

    const businessId = await businessModel.create(req.body, req.user.id);

    logAudit({
      user_id: req.user.id,
      action: 'business.created',
      entity_type: 'business',
      entity_id: businessId,
      metadata: { business_code, business_name: req.body.business_name }
    });

    const created = await businessModel.findById(businessId);
    res.status(201).json({ status: 'success', message: 'Business created successfully', data: created });
  } catch (err) {
    console.error('Business create error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create business', code: 'DB_ERROR' });
  }
});

// PUT /api/businesses/:id
router.put('/:id', [
  body('business_code').optional().trim().isLength({ min: 2 }),
  body('business_name').optional().trim().isLength({ min: 2 }),
  body('description').optional().trim(),
  body('logo_url').optional().trim(),
  body('email').optional().isEmail(),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('status').optional().isIn(['active', 'inactive']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const businessId = parseInt(req.params.id);
    const target = await businessModel.findById(businessId);
    if (!target) {
      return res.status(404).json({ status: 'error', message: 'Business not found', code: 'NOT_FOUND' });
    }

    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Admin access required', code: 'ADMIN_REQUIRED' });
    }

    const updates = {};
    const allowed = ['business_code', 'business_name', 'description', 'logo_url', 'email', 'phone', 'address', 'status'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No changes provided', code: 'VALIDATION_ERROR' });
    }

    const oldLogoUrl = target.logo_url || null;

    await businessModel.update(businessId, updates, req.user.id);

    if (oldLogoUrl && updates.logo_url && oldLogoUrl !== updates.logo_url) {
      await businessModel.removeOldLogo(oldLogoUrl);
    }

    logAudit({
      user_id: req.user.id,
      action: 'business.updated',
      entity_type: 'business',
      entity_id: businessId,
      metadata: updates
    });

    res.json({ status: 'success', message: 'Business updated successfully' });
  } catch (err) {
    console.error('Business update error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update business', code: 'DB_ERROR' });
  }
});

// DELETE /api/businesses/:id
router.delete('/:id', async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);

    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ status: 'error', message: 'Only super admins can delete businesses', code: 'ADMIN_ONLY' });
    }

    const target = await businessModel.findById(businessId);
    if (!target) {
      return res.status(404).json({ status: 'error', message: 'Business not found', code: 'NOT_FOUND' });
    }

    if (target.logo_url) {
      await businessModel.removeOldLogo(target.logo_url);
    }

    await businessModel.remove(businessId);

    logAudit({
      user_id: req.user.id,
      action: 'business.deleted',
      entity_type: 'business',
      entity_id: businessId,
      metadata: { business_code: target.business_code, business_name: target.business_name }
    });

    res.json({ status: 'success', message: 'Business deleted successfully' });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ status: 'error', message: err.message, code: 'HAS_DEPARTMENTS' });
    }
    console.error('Business delete error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete business', code: 'DB_ERROR' });
  }
});

module.exports = router;

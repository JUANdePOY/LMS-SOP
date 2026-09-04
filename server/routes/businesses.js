const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requireSuperAdmin, requireAdmin } = require('../middleware/auth');
const { requireBusinessScope } = require('../middleware/scope');
const { logAudit } = require('../utils/auditLogger');
const businessModel = require('../models/businessModel');
const { upload } = require('../middleware/businessUpload');
const { projectController } = require('../controllers/projectController');

const router = express.Router();

router.use(authenticateToken);

// GET /api/businesses
router.get('/', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const parsedLimit = parseInt(limit) || 50;
    const parsedPage = parseInt(page) || 1;

    // Super admins (and users explicitly scoped to a single business) use the
    // normal scoped lookup. Users without a direct business_id (e.g. department
    // heads) are NOT rejected: the navigation tree needs the SOP businesses that
    // own the clients they manage. We return just those businesses so the panel
    // can render without leaking unrelated businesses.
    const callsAll = req.user.role === 'super_admin';
    const scopedBusinessId = !callsAll ? req.user.business_id : null;

    let result;
    if (!callsAll && !scopedBusinessId) {
      result = await businessModel.findBusinessesWithClients({
        search: search || undefined,
        status: status || undefined,
        page: parsedPage,
        limit: parsedLimit,
      });
    } else {
      result = await businessModel.findAll({
        search: search || undefined,
        status: status || undefined,
        business_id: scopedBusinessId,
        page: parsedPage,
        limit: parsedLimit,
      });
    }
    res.json({ status: 'success', data: result });
  } catch (err) {
    console.error('Businesses list error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch businesses', code: 'DB_ERROR' });
  }
});

// GET /api/businesses/:id/projects
// Portfolio tree: lazy-load a business's projects (with task rollups) on expand.
router.get('/:id/projects', authenticateToken, requireAdmin, projectController.listByBusiness);

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
    const businessId = parseInt(req.params.id);
    const business = await businessModel.findById(businessId);
    if (!business) {
      return res.status(404).json({ status: 'error', message: 'Business not found', code: 'NOT_FOUND' });
    }

    if (req.user.role !== 'super_admin' && req.user.business_id !== businessId) {
      return res.status(403).json({ status: 'error', message: 'Access denied to this business', code: 'BUSINESS_SCOPE_DENIED' });
    }

    res.json({ status: 'success', data: business });
  } catch (err) {
    console.error('Business fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch business', code: 'DB_ERROR' });
  }
});

// POST /api/businesses/:id/logo
// Uploads logo binary data into the LONGBLOB column
router.post('/:id/logo', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    const target = await businessModel.findById(businessId);
    if (!target) {
      return res.status(404).json({ status: 'error', message: 'Business not found', code: 'NOT_FOUND' });
    }

    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Admin access required', code: 'ADMIN_REQUIRED' });
    }

    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded', code: 'VALIDATION_ERROR' });
    }

    const { originalname, buffer, mimetype, size } = req.file;

    await businessModel.saveLogo(businessId, {
      buffer,
      name: originalname,
      mime: mimetype,
      size,
    });

    logAudit({
      user_id: req.user.id,
      action: 'business.logo.uploaded',
      entity_type: 'business',
      entity_id: businessId,
      metadata: { logo_name: originalname, logo_mime_type: mimetype, logo_size: size },
    });

    res.status(201).json({
      status: 'success',
      message: 'Logo uploaded successfully',
      data: { logo_name: originalname, logo_mime_type: mimetype, logo_size: size },
    });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to upload logo', code: 'UPLOAD_ERROR' });
  }
});

// DELETE /api/businesses/:id/logo
// Removes the stored logo from the LONGBLOB column
router.delete('/:id/logo', authenticateToken, async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    const target = await businessModel.findById(businessId);
    if (!target) {
      return res.status(404).json({ status: 'error', message: 'Business not found', code: 'NOT_FOUND' });
    }

    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Admin access required', code: 'ADMIN_REQUIRED' });
    }

    if (!target.logo_data) {
      return res.status(404).json({ status: 'error', message: 'No logo to remove', code: 'NOT_FOUND' });
    }

    await businessModel.clearLogo(businessId);

    logAudit({
      user_id: req.user.id,
      action: 'business.logo.removed',
      entity_type: 'business',
      entity_id: businessId,
      metadata: { logo_name: target.logo_name },
    });

    res.json({ status: 'success', message: 'Logo removed successfully' });
  } catch (err) {
    console.error('Logo removal error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to remove logo', code: 'DB_ERROR' });
  }
});

// GET /api/businesses/:id/logo
// Serves the stored logo binary data with correct Content-Type
router.get('/:id/logo', async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    const logo = await businessModel.getLogo(businessId);

    if (!logo || !logo.logo_data) {
      return res.status(404).json({ status: 'error', message: 'Logo not found', code: 'NOT_FOUND' });
    }

    res.set('Content-Type', logo.logo_mime_type);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(logo.logo_data);
  } catch (err) {
    console.error('Logo fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch logo', code: 'DB_ERROR' });
  }
});

// POST /api/businesses
router.post('/', [
  body('business_code').trim().isLength({ min: 2 }).withMessage('Business code is required'),
  body('business_name').trim().isLength({ min: 2 }).withMessage('Business name is required'),
  body('description').optional().trim(),
  body('logo_name').optional().trim(),
  body('logo_mime_type').optional().trim(),
  body('logo_size').optional().isInt({ min: 0 }),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('status').optional().isIn(['active', 'inactive']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ status: 'error', message: 'Only super admins can create businesses', code: 'SUPER_ADMIN_REQUIRED' });
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
  body('logo_name').optional().trim(),
  body('logo_mime_type').optional().trim(),
  body('logo_size').optional().isInt({ min: 0 }),
  body('email').optional({ checkFalsy: true }).isEmail(),
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

    if (req.user.role !== 'super_admin' && req.user.business_id !== businessId) {
      return res.status(403).json({ status: 'error', message: 'Cannot update another business', code: 'BUSINESS_SCOPE_DENIED' });
    }

    const updates = {};
    const allowed = [
      'business_code', 'business_name', 'description',
      'logo_name', 'logo_mime_type', 'logo_size',
      'email', 'phone', 'address', 'status',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No changes provided', code: 'VALIDATION_ERROR' });
    }

    await businessModel.update(businessId, updates, req.user.id);

    logAudit({
      user_id: req.user.id,
      action: 'business.updated',
      entity_type: 'business',
      entity_id: businessId,
      metadata: updates,
    });

    res.json({ status: 'success', message: 'Business updated successfully' });
  } catch (err) {
    console.error('Business update error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update business', code: 'DB_ERROR' });
  }
});

// DELETE /api/businesses/:id
//
// Two modes, chosen by the `force` query param:
//   force=false (default) — soft-hide: flip status to `inactive`. The row and
//     its departments/clients/tasks stay intact so the org structure survives
//     and can be restored. Used by the SecondarySidebar, where "delete" means
//     "hide from all users".
//   force=true — hard purge: physically DELETE the row and (with it, via
//     businessModel.remove's cascade) its departments. Used by the Businesses
//     management page, where "delete" means the entity is gone for good.
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

    const force = req.query.force === 'true';

    if (force) {
      const affected = await businessModel.remove(businessId, true);
      if (!affected) {
        return res.status(404).json({ status: 'error', message: 'Business not found', code: 'NOT_FOUND' });
      }

      logAudit({
        user_id: req.user.id,
        action: 'business.deleted',
        entity_type: 'business',
        entity_id: businessId,
        metadata: { business_code: target.business_code, business_name: target.business_name, forced: true },
      });

      return res.json({ status: 'success', message: 'Business deleted successfully' });
    }

    const hidden = await businessModel.softRemove(businessId, req.user.id);
    if (!hidden) {
      return res.status(409).json({ status: 'error', message: 'Business is already hidden', code: 'ALREADY_INACTIVE' });
    }

    logAudit({
      user_id: req.user.id,
      action: 'business.hidden',
      entity_type: 'business',
      entity_id: businessId,
      metadata: { business_code: target.business_code, business_name: target.business_name },
    });

    res.json({ status: 'success', message: 'Business hidden from all users' });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ status: 'error', message: 'Business not found', code: 'NOT_FOUND' });
    }
    if (err.code === 'HAS_DEPENDENCIES') {
      return res.status(409).json({ status: 'error', message: err.message, code: 'HAS_DEPENDENCIES' });
    }
    console.error('Business delete error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete business', code: 'DB_ERROR' });
  }
});

module.exports = router;

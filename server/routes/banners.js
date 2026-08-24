const router = require('express').Router();
const db = require('../config/database');
const { authenticateToken, resolveScope } = require('../middleware/auth');
const { requirePermission } = require('../middleware/scope');
const bannerService = require('../services/bannerService');

function sendError(res, statusCode, code, message) {
  return res.status(statusCode).json({ success: false, code, message });
}

function mapBanner(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    ctaLabel: row.cta_label,
    ctaLink: row.cta_link,
    imageUrl: row.image_url,
    priority: row.priority,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    audience: row.audience,
    targetRoles: row.target_roles,
    targetDepartments: row.target_departments,
    targetUserIds: row.target_user_ids,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Active banners for the calling user (client-driven banner slot).
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const banners = await bannerService.getActiveBannersForUser(req.user);
    res.json({ success: true, banners: banners.map(mapBanner) });
  } catch (err) {
    console.error('Active banners error:', err);
    sendError(res, 500, 'BANNER_FETCH_ERROR', 'Failed to load banners');
  }
});

// Admin: list all banners (optionally filtered by status).
router.get('/', authenticateToken, resolveScope, requirePermission('banners.manage'), async (req, res) => {
  try {
    const status = req.query.status || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const banners = await bannerService.listBanners({ status, limit, offset });
    res.json({ success: true, banners: banners.map(mapBanner) });
  } catch (err) {
    console.error('Banner list error:', err);
    sendError(res, 500, 'BANNER_LIST_ERROR', 'Failed to list banners');
  }
});

// Admin: banner analytics.
router.get('/:id/stats', authenticateToken, resolveScope, requirePermission('banners.manage'), async (req, res) => {
  try {
    const stats = await bannerService.getBannerStats(req.params.id);
    res.json({ success: true, stats });
  } catch (err) {
    console.error('Banner stats error:', err);
    sendError(res, 500, 'BANNER_STATS_ERROR', 'Failed to load banner stats');
  }
});

// Admin: create banner.
router.post('/', authenticateToken, resolveScope, requirePermission('banners.manage'), async (req, res) => {
  try {
    const {
      title, message, type, ctaLabel, ctaLink, imageUrl, priority,
      status, startAt, endAt, audience, targetRoles, targetDepartments, targetUserIds,
    } = req.body;

    if (!title) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Title is required');
    }

    const id = await bannerService.createBanner({
      title,
      message,
      type,
      ctaLabel,
      ctaLink,
      imageUrl,
      priority,
      status: status || 'draft',
      startAt,
      endAt,
      audience: audience || 'all',
      targetRoles,
      targetDepartments,
      targetUserIds,
      createdBy: req.user.id,
    });

    if (!id) {
      return sendError(res, 500, 'BANNER_CREATE_ERROR', 'Failed to create banner');
    }
    res.status(201).json({ success: true, data: { id } });
  } catch (err) {
    console.error('Banner create error:', err);
    sendError(res, 500, 'BANNER_CREATE_ERROR', 'Failed to create banner');
  }
});

// Admin: update banner.
router.put('/:id', authenticateToken, resolveScope, requirePermission('banners.manage'), async (req, res) => {
  try {
    const ok = await bannerService.updateBanner(req.params.id, req.body);
    if (!ok) return sendError(res, 404, 'NOT_FOUND', 'Banner not found');
    res.json({ success: true });
  } catch (err) {
    console.error('Banner update error:', err);
    sendError(res, 500, 'BANNER_UPDATE_ERROR', 'Failed to update banner');
  }
});

// Admin: set status.
router.patch('/:id/status', authenticateToken, resolveScope, requirePermission('banners.manage'), async (req, res) => {
  try {
    const { status } = req.body;
    const ok = await bannerService.setBannerStatus(req.params.id, status);
    if (!ok) return sendError(res, 400, 'INVALID_STATUS', 'Invalid or unknown status');
    res.json({ success: true });
  } catch (err) {
    console.error('Banner status error:', err);
    sendError(res, 500, 'BANNER_STATUS_ERROR', 'Failed to update status');
  }
});

// Admin: delete banner.
router.delete('/:id', authenticateToken, resolveScope, requirePermission('banners.manage'), async (req, res) => {
  try {
    const ok = await bannerService.deleteBanner(req.params.id);
    if (!ok) return sendError(res, 404, 'NOT_FOUND', 'Banner not found');
    res.json({ success: true });
  } catch (err) {
    console.error('Banner delete error:', err);
    sendError(res, 500, 'BANNER_DELETE_ERROR', 'Failed to delete banner');
  }
});

// Record an impression/click/dismiss/snooze event (authenticated user).
router.post('/:id/events', authenticateToken, async (req, res) => {
  try {
    const { event } = req.body;
    const ok = await bannerService.recordEvent(req.params.id, req.user.id, event);
    if (!ok) return sendError(res, 400, 'INVALID_EVENT', 'Invalid event type');
    res.json({ success: true });
  } catch (err) {
    console.error('Banner event error:', err);
    sendError(res, 500, 'BANNER_EVENT_ERROR', 'Failed to record event');
  }
});

module.exports = router;

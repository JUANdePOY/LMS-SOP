const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../config/database');
const { businessManagerController, listAvailable } = require('../controllers/businessManagerController');

const router = express.Router();
router.use(authenticateToken);

// Scope guard: only admins/super_admins who own the target client_business
// can grant or list managers for it. The route param is a client_businesses.id,
// whose `business_id` FK points at the top-level businesses table — so we resolve
// that ownership here rather than relying on requireBusinessScope (which compares
// the actor's business_id against the raw param).
async function requireClientBusinessScope(req, res, next) {
  try {
    if (req.user.role === 'super_admin') return next();
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied', code: 'FORBIDDEN' });
    }
    const businessId = parseInt(req.params.businessId, 10);
    if (!Number.isFinite(businessId) || businessId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid business id', code: 'VALIDATION_ERROR' });
    }
    // Ownership is at the SOP-business level, not the unit level. The route
    // param is a client_businesses.id (a unit), which has no business_id of its
    // own — the owning SOP business is reached through the unit's client:
    //   client_businesses.client_id -> clients.id -> clients.business_id
    // and that last value is exactly what an admin is scoped to
    // (users.business_id). Comparing the actor's business_id against the unit
    // id directly never matched, so every grant/revoke/list came back
    // BUSINESS_SCOPE_DENIED and employees could never be assigned.
    const [rows] = await db.query(
      `SELECT cb.id, c.business_id AS owner_business_id
       FROM client_businesses cb
       INNER JOIN clients c ON c.id = cb.client_id
       WHERE cb.id = ? LIMIT 1`,
      [businessId]
    );
    const cb = rows[0];
    if (!cb) {
      return res.status(404).json({ success: false, message: 'Business not found', code: 'NOT_FOUND' });
    }
    if (Number(cb.owner_business_id) !== Number(req.user.business_id)) {
      return res.status(403).json({ success: false, message: 'Access denied to this business', code: 'BUSINESS_SCOPE_DENIED' });
    }
    next();
  } catch (err) {
    console.error('[businessManagers] scope check failed:', err);
    return res.status(500).json({ success: false, message: 'Scope check failed', code: 'INTERNAL_ERROR' });
  }
}

// GET  /api/client-businesses/:businessId/managers — list managers for a business
router.get('/:businessId/managers', requireClientBusinessScope, businessManagerController.list);

// GET  /api/client-businesses/:businessId/managers/available — users who can be granted
router.get('/:businessId/managers/available', requireClientBusinessScope, listAvailable);

// POST /api/client-businesses/:businessId/managers — grant a user management access
router.post('/:businessId/managers', requireClientBusinessScope, requireAdmin, businessManagerController.grant);

// DELETE /api/client-businesses/:businessId/managers/:userId — revoke access
router.delete('/:businessId/managers/:userId', requireClientBusinessScope, requireAdmin, businessManagerController.revoke);

module.exports = router;
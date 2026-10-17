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
    if (['super_admin', 'admin'].includes(req.user.role)) return next();
    if (!['super_admin', 'admin', 'department_head'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You don\'t have permission to manage business managers.', code: 'FORBIDDEN' });
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
    // A department head's own users.business_id is often NULL (they are scoped
    // via their department's business, exposed as department_business_id), so
    // accept either the actor's business_id or their department's business.
    // Resolve the department's business on the fly rather than trusting the
    // token payload, which may not carry department_business_id.
    const actorBizId = Number(req.user.business_id);
    const ownerBizId = Number(cb.owner_business_id);
    if (actorBizId === ownerBizId) return next();
    const candidateDeptIds = [];
    if (req.user.department_id != null) candidateDeptIds.push(req.user.department_id);
    const scopedDeptIds = Array.isArray(req.user.scoped_department_ids)
      ? req.user.scoped_department_ids
      : [];
    for (const d of scopedDeptIds) candidateDeptIds.push(d);
    const uniqueDeptIds = [...new Set(candidateDeptIds)];
    if (uniqueDeptIds.length > 0) {
      const placeholders = uniqueDeptIds.map(() => '?').join(',');
      // 1. The department's owning SOP business matches.
      const [deptRows] = await db.query(
        `SELECT business_id FROM departments WHERE id IN (${placeholders})`,
        uniqueDeptIds
      );
      if (deptRows.some((r) => Number(r.business_id) === ownerBizId)) return next();
      // 2. The department has been granted task-management access to this
      //    client_business via the business_departments junction table.
      const [bizDeptRows] = await db.query(
        `SELECT 1 FROM business_departments bd
         INNER JOIN departments d ON d.id = bd.department_id
         WHERE bd.business_id = ? AND bd.department_id IN (${placeholders})
         LIMIT 1`,
        [ownerBizId, ...uniqueDeptIds]
      );
      if (bizDeptRows.length > 0) return next();
    }
    // 3. The department head themselves has been granted business-manager
    //    access to this client_business (business_managers.user_id).
    const [bmRows] = await db.query(
      'SELECT 1 FROM business_managers WHERE business_id = ? AND user_id = ? LIMIT 1',
      [ownerBizId, req.user.id]
    );
    if (bmRows.length > 0) return next();
    return res.status(403).json({ success: false, message: 'You don\'t have access to this business.', code: 'BUSINESS_SCOPE_DENIED' });
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
const taskService = require('../services/taskService');
const db = require('../config/database');
const { logAudit } = require('../utils/auditLogger');
const taskNotifications = require('../services/taskNotificationService');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  const body = { success: false, message };
  if (code === 500) console.error('[BusinessManager Error]', err);
  return res.status(code).json(body);
}

async function listAvailable(req, res) {
  try {
    const businessId = parseInt(req.params.businessId, 10);
    if (!Number.isFinite(businessId) || businessId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid business id', code: 'VALIDATION_ERROR' });
    }
    const search = String(req.query.search || '').trim();
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const like = search ? `%${search}%` : '%%';
    const [rows] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.department_id, u.business_id
       FROM users u
       WHERE u.is_active = 1
         AND (u.full_name LIKE ? OR u.email LIKE ?)
       ORDER BY u.full_name ASC
       LIMIT ?`,
      [like, like, limit]
    );
    res.json({ success: true, data: rows, message: 'Available users retrieved successfully' });
  } catch (error) {
    sendError(res, error, 'Failed to load available users');
  }
}

const businessManagerController = {
  async list(req, res) {
    try {
      const businessId = parseInt(req.params.businessId, 10);
      if (!Number.isFinite(businessId) || businessId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid business id', code: 'VALIDATION_ERROR' });
      }
      const managers = await taskService.listBusinessManagers(businessId);
      res.json({ success: true, data: managers, message: 'Business managers retrieved successfully' });
    } catch (error) {
      sendError(res, error, 'Failed to load business managers');
    }
  },

  async grant(req, res) {
    try {
      const businessId = parseInt(req.params.businessId, 10);
      const userId = req.body?.user_id != null ? parseInt(req.body.user_id, 10) : NaN;
      if (!Number.isFinite(businessId) || businessId <= 0 || !Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ success: false, message: 'businessId and a valid user_id are required', code: 'VALIDATION_ERROR' });
      }
      const manager = await taskService.grantBusinessManager(businessId, userId, req.user.id);
      logAudit('business.manager.grant', req.user.id, { business_id: businessId, user_id: userId });
      // Tell the granted employee they've been assigned to the business. This
      // is the banner that lands on their My Tasks page — without it they'd
      // have no signal that they can now edit every task in that business.
      taskNotifications.notifyBusinessManagerGranted(businessId, userId, req.user.id).catch(() => {});
      res.status(201).json({ success: true, data: manager, message: 'Business manager granted successfully' });
    } catch (error) {
      sendError(res, error, 'Failed to grant business manager');
    }
  },

  async revoke(req, res) {
    try {
      const businessId = parseInt(req.params.businessId, 10);
      const userId = parseInt(req.params.userId, 10);
      if (!Number.isFinite(businessId) || businessId <= 0 || !Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid business id or user id', code: 'VALIDATION_ERROR' });
      }
      const removed = await taskService.revokeBusinessManager(businessId, userId);
      if (!removed) {
        return res.status(404).json({ success: false, message: 'Business manager not found', code: 'NOT_FOUND' });
      }
      logAudit('business.manager.revoke', req.user.id, { business_id: businessId, user_id: userId });
      res.json({ success: true, message: 'Business manager revoked successfully' });
    } catch (error) {
      sendError(res, error, 'Failed to revoke business manager');
    }
  },
};

module.exports = { businessManagerController, listAvailable };

module.exports = { businessManagerController, listAvailable };
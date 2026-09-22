const taskService = require('../services/taskService');
const db = require('../config/database');
const { logAudit } = require('../utils/auditLogger');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  const body = { success: false, message };
  if (code === 500) console.error('[BusinessDepartment Error]', err);
  return res.status(code).json(body);
}

async function requireClientBusinessScope(req, res, next) {
  try {
    if (req.user.role === 'super_admin') return next();
    if (!['super_admin', 'admin', 'department_head'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You don\'t have permission to manage business departments.', code: 'FORBIDDEN' });
    }
    const businessId = parseInt(req.params.businessId, 10);
    if (!Number.isFinite(businessId) || businessId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid business id', code: 'VALIDATION_ERROR' });
    }
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
      return res.status(403).json({ success: false, message: 'You don\'t have access to this business.', code: 'BUSINESS_SCOPE_DENIED' });
    }
    next();
  } catch (err) {
    console.error('[businessDepartments] scope check failed:', err);
    return res.status(500).json({ success: false, message: 'Scope check failed', code: 'INTERNAL_ERROR' });
  }
}

const businessDepartmentController = {
  async list(req, res) {
    try {
      const businessId = parseInt(req.params.businessId, 10);
      if (!Number.isFinite(businessId) || businessId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid business id', code: 'VALIDATION_ERROR' });
      }
      const departments = await taskService.listBusinessDepartments(businessId);
      res.json({ success: true, data: departments, message: 'Business departments retrieved successfully' });
    } catch (error) {
      sendError(res, error, 'Failed to load business departments');
    }
  },

  async grant(req, res) {
    try {
      const businessId = parseInt(req.params.businessId, 10);
      const departmentId = req.body?.department_id != null ? parseInt(req.body.department_id, 10) : NaN;
      if (!Number.isFinite(businessId) || businessId <= 0 || !Number.isFinite(departmentId) || departmentId <= 0) {
        return res.status(400).json({ success: false, message: 'businessId and a valid department_id are required', code: 'VALIDATION_ERROR' });
      }
      const record = await taskService.grantBusinessDepartment(businessId, departmentId, req.user.id);
      logAudit('business.department.grant', req.user.id, { business_id: businessId, department_id: departmentId });
      res.status(201).json({ success: true, data: record, message: 'Department granted to business successfully' });
    } catch (error) {
      sendError(res, error, 'Failed to grant department to business');
    }
  },

  async revoke(req, res) {
    try {
      const businessId = parseInt(req.params.businessId, 10);
      const departmentId = parseInt(req.params.departmentId, 10);
      if (!Number.isFinite(businessId) || businessId <= 0 || !Number.isFinite(departmentId) || departmentId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid business id or department id', code: 'VALIDATION_ERROR' });
      }
      const removed = await taskService.revokeBusinessDepartment(businessId, departmentId);
      if (!removed) {
        return res.status(404).json({ success: false, message: 'Department not found for this business', code: 'NOT_FOUND' });
      }
      logAudit('business.department.revoke', req.user.id, { business_id: businessId, department_id: departmentId });
      res.json({ success: true, message: 'Department revoked from business successfully' });
    } catch (error) {
      sendError(res, error, 'Failed to revoke department from business');
    }
  },
};

module.exports = { businessDepartmentController, requireClientBusinessScope };

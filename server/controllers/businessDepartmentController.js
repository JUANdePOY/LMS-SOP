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
    if (['super_admin', 'admin'].includes(req.user.role)) return next();
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

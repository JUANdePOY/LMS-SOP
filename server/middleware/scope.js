const db = require('../config/database');

function requireBusinessScope(businessIdParam = 'businessId') {
  return async (req, res, next) => {
    if (req.user.role === 'super_admin') {
      return next();
    }

    const targetBusinessId = parseInt(
      req.params[businessIdParam] || req.body[businessIdParam],
      10
    );

    if (!targetBusinessId || req.user.business_id !== targetBusinessId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied to this business',
        code: 'BUSINESS_SCOPE_DENIED',
      });
    }

    next();
  };
}

function requireDepartmentScope(departmentIdParam = 'departmentId') {
  return async (req, res, next) => {
    if (['super_admin', 'admin'].includes(req.user.role)) {
      return next();
    }

    const targetDeptId = parseInt(
      req.params[departmentIdParam] || req.body[departmentIdParam],
      10
    );

    if (!targetDeptId || isNaN(targetDeptId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid departmentId is required',
        code: 'MISSING_DEPT_ID',
      });
    }

    const [[dept]] = await db.query(
      'SELECT business_id FROM departments WHERE id = ?',
      [targetDeptId]
    );

    if (!dept || req.user.business_id !== dept.business_id) {
      return res.status(403).json({
        status: 'error',
        message: 'Department is outside your business scope',
        code: 'DEPT_OUT_OF_BUSINESS_SCOPE',
      });
    }

    const [[grant]] = await db.query(
      'SELECT id FROM department_scope_grants WHERE user_id = ? AND department_id = ?',
      [req.user.id, targetDeptId]
    );

    if (!grant) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not scoped to this department',
        code: 'DEPT_SCOPE_DENIED',
      });
    }

    next();
  };
}

function requirePermission(permissionName) {
  return async (req, res, next) => {
    const role = req.user?.role || '';
    if (role === 'super_admin' || role === 'admin') {
      return next();
    }

    const perms = req.user?.permissions || [];
    if (!perms.includes(permissionName)) {
      return res.status(403).json({
        status: 'error',
        message: `Missing permission: ${permissionName}`,
        code: 'PERMISSION_DENIED',
      });
    }

    next();
  };
}

async function resolveUserPermissions(userId, role) {
  if (role === 'super_admin') {
    const [allPerms] = await db.query('SELECT name FROM permissions WHERE is_active = TRUE');
    return allPerms.map((p) => p.name);
  }

  const [rows] = await db.query(
    `SELECT p.name
     FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_name = p.name
     LEFT JOIN user_permission_overrides upo
       ON upo.permission_name = p.name
       AND upo.user_id = ?
       AND upo.granted = TRUE
     WHERE rp.role_name = ?
       AND p.is_active = TRUE
     GROUP BY p.name`,
    [userId, role]
  );

  return rows.map((r) => r.name);
}

module.exports = {
  requireBusinessScope,
  requireDepartmentScope,
  requirePermission,
  resolveUserPermissions,
};

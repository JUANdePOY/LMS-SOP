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
     WHERE rp.role_name = ?
       AND p.is_active = TRUE
       AND (upo.permission_name IS NULL OR upo.granted = TRUE)
     GROUP BY p.name`,
    [userId, role]
  );

  return rows.map((r) => r.name);
}

function parseActions(actionsJson, permissionName) {
  if (actionsJson) {
    try {
      const arr = Array.isArray(actionsJson) ? actionsJson : JSON.parse(actionsJson);
      if (Array.isArray(arr)) return arr.filter((a) => typeof a === 'string');
    } catch {}
  }
  if (permissionName.startsWith('view_')) return ['view'];
  if (permissionName.startsWith('manage_')) return ['view', 'create', 'edit', 'delete', 'approve', 'publish', 'archive', 'assign'];
  const dotIndex = permissionName.lastIndexOf('.');
  if (dotIndex !== -1) {
    const action = permissionName.substring(dotIndex + 1);
    return ['view', action];
  }
  return [];
}

async function resolveUserPermissionDetails(userId, role) {
  if (role === 'super_admin') {
    const [allPerms] = await db.query('SELECT name, actions FROM permissions WHERE is_active = TRUE');
    return allPerms.map((p) => ({
      name: p.name,
      actions: parseActions(p.actions, p.name),
    }));
  }

  const [rolePerms] = await db.query(
    `SELECT p.name, p.actions
     FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_name = p.name
     WHERE rp.role_name = ? AND p.is_active = TRUE`,
    [role]
  );

  const [overrides] = await db.query(
    `SELECT permission_name, granted, actions
     FROM user_permission_overrides
     WHERE user_id = ?`,
    [userId]
  );

  const overrideMap = new Map();
  for (const o of overrides) {
    overrideMap.set(o.permission_name, o);
  }

  const result = [];
  for (const perm of rolePerms) {
    const override = overrideMap.get(perm.name);
    if (override) {
      if (!override.granted) continue;
      const definedActions = parseActions(perm.actions, perm.name);
      let userActions;
      if (override.actions === null) {
        userActions = definedActions;
      } else {
        userActions = parseActions(override.actions, perm.name);
        if (userActions.length === 0) continue;
        userActions = userActions.filter((a) => definedActions.includes(a));
        if (userActions.length === 0) continue;
      }
      result.push({ name: perm.name, actions: userActions });
    } else {
      result.push({ name: perm.name, actions: parseActions(perm.actions, perm.name) });
    }
  }

  return result;
}

function requirePermission(permissionName) {
  return async (req, res, next) => {
    const role = req.user?.role || '';
    if (role === 'super_admin') {
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

    const details = req.user?.permission_details || [];
    const permDetail = details.find((d) => d.name === permissionName);
    if (permDetail && Array.isArray(permDetail.actions) && permDetail.actions.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: `Missing permission: ${permissionName}`,
        code: 'PERMISSION_DENIED',
      });
    }

    next();
  };
}

function requirePermissionAction(permissionName, action) {
  return async (req, res, next) => {
    if (req.user?.role === 'super_admin') {
      return next();
    }

    let details = req.user?.permission_details;
    if (!Array.isArray(details)) {
      try {
        details = await resolveUserPermissionDetails(req.user?.id, req.user?.role);
        req.user.permission_details = details;
      } catch (err) {
        return res.status(403).json({
          status: 'error',
          message: `Missing permission action: ${permissionName}.${action}`,
          code: 'PERMISSION_ACTION_DENIED',
        });
      }
    }

    const permDetail = details.find((d) => d.name === permissionName);
    if (!permDetail || !Array.isArray(permDetail.actions) || !permDetail.actions.includes(action)) {
      return res.status(403).json({
        status: 'error',
        message: `Missing permission action: ${permissionName}.${action}`,
        code: 'PERMISSION_ACTION_DENIED',
      });
    }

    next();
  };
}

module.exports = {
  requireBusinessScope,
  requireDepartmentScope,
  requirePermission,
  requirePermissionAction,
  resolveUserPermissions,
  resolveUserPermissionDetails,
  parseActions,
};

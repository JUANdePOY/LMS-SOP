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
      message: 'You don\'t have access to this business.',
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
        message: 'A valid department ID is required.',
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
      message: 'This department belongs to a different business.',
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
      message: 'You don\'t have access to this department.',
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
    `SELECT p.name, p.actions AS permission_actions, rp.actions AS role_actions
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
      const definedActions = parseActions(perm.role_actions || perm.permission_actions, perm.name);
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
      result.push({ name: perm.name, actions: parseActions(perm.role_actions || perm.permission_actions, perm.name) });
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
      message: 'You don\'t have permission to do this.',
      code: 'PERMISSION_DENIED',
    });
    }

    const details = req.user?.permission_details || [];
    const permDetail = details.find((d) => d.name === permissionName);
    if (permDetail && Array.isArray(permDetail.actions) && permDetail.actions.length === 0) {
    return res.status(403).json({
      status: 'error',
      message: 'You don\'t have permission to do this.',
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
          message: 'You don\'t have permission to perform this action.',
          code: 'PERMISSION_ACTION_DENIED',
        });
      }
    }

    const permDetail = details.find((d) => d.name === permissionName);
    if (!permDetail || !Array.isArray(permDetail.actions) || !permDetail.actions.includes(action)) {
      return res.status(403).json({
        status: 'error',
        message: 'You don\'t have permission to perform this action.',
        code: 'PERMISSION_ACTION_DENIED',
      });
    }

    next();
  };
}

async function resolveUserEntityOverrides(userId) {
  const [overrides] = await db.query(
    `SELECT id, permission_name, entity_type, entity_id, granted, actions
     FROM entity_permission_overrides
     WHERE user_id = ?`,
    [userId]
  );
  return overrides.map((o) => ({
    id: o.id,
    permission_name: o.permission_name,
    entity_type: o.entity_type,
    entity_id: o.entity_id,
    granted: !!o.granted,
    actions: parseActions(o.actions, o.permission_name),
  }));
}

async function resolveRoleEntityPermissions(roleName) {
  const [overrides] = await db.query(
    `SELECT id, permission_name, entity_type, entity_id, granted, actions
     FROM role_entity_permissions
     WHERE role_name = ?`,
    [roleName]
  );
  return overrides.map((o) => ({
    id: o.id,
    permission_name: o.permission_name,
    entity_type: o.entity_type,
    entity_id: o.entity_id,
    granted: !!o.granted,
    actions: parseActions(o.actions, o.permission_name),
  }));
}

function buildEntityAccessMap(entityOverrides) {
  const map = new Map();
  for (const o of entityOverrides || []) {
    if (!map.has(o.entity_type)) {
      map.set(o.entity_type, { granted: new Set(), denied: new Set() });
    }
    const bucket = map.get(o.entity_type);
    if (o.granted) {
      bucket.granted.add(o.entity_id);
    } else {
      bucket.denied.add(o.entity_id);
    }
  }
  return map;
}

function canAccessEntity(user, entityType, entityId) {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  const overrides = user.entity_overrides || [];
  const accessMap = buildEntityAccessMap(overrides);
  const typeAccess = accessMap.get(entityType);
  if (!typeAccess) return true;
  if (typeAccess.denied.has(entityId)) return false;
  if (typeAccess.granted.has(entityId)) return true;
  return false;
}

function isEntityTypeDeniedForUser(user, entityType) {
  if (!user) return false;
  if (user.role === 'super_admin') return false;
  const overrides = user.entity_overrides || [];
  const accessMap = buildEntityAccessMap(overrides);
  const typeAccess = accessMap.get(entityType);
  if (!typeAccess) return false;
  return typeAccess.denied.size > 0 && typeAccess.granted.size === 0;
}

function requireEntityTypeAccess(entityType) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Please log in to continue.', code: 'UNAUTHENTICATED' });
    }
    if (req.user.role === 'super_admin') {
      return next();
    }
    if (isEntityTypeDeniedForUser(req.user, entityType)) {
      return res.status(403).json({
        status: 'error',
        message: `You don't have access to this resource.`,
        code: 'ENTITY_ACCESS_DENIED',
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
  resolveUserEntityOverrides,
  resolveRoleEntityPermissions,
  parseActions,
  canAccessEntity,
  isEntityTypeDeniedForUser,
  requireEntityTypeAccess,
};

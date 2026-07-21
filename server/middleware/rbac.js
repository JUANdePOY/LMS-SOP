/**
 * RBAC (Role-Based Access Control) Middleware
 * Provides role-based authorization checks for routes
 * Supports granular admin roles: admin, admin_arsen, admin_group, admin_squadron
 *
 * DESIGN NOTE (scope model):
 * Every module (Arcen/Group/Squadron) is visible to every admin-tier role —
 * nothing is hidden. What differs per role is whether that module is
 * read-only or manageable:
 *   admin_arsen    -> Arcen: read-only. Group + Squadron: manage, within
 *                      their own ARSEN. (cannot create/edit ARSENs)
 *   admin_group    -> Arcen + Group: read-only. Squadron: manage, within
 *                      their own Group. (cannot create/edit Groups)
 *   admin_squadron -> Arcen + Group: read-only. Squadron: manage, but only
 *                      their OWN squadron record (cannot create new
 *                      squadrons or touch anyone else's).
 * `admin` has unrestricted access everywhere. `reservist` is read-only
 * everywhere.
 *
 * Instead of hiding out-of-scope rows on GET/list endpoints, we return them
 * with a `can_manage` flag so the frontend can render them read-only. Only
 * mutating routes (POST/PUT/PATCH/DELETE) are blocked outright, via
 * authorizeManageEntity() below.
 */

const ADMIN_ROLES = ['admin', 'admin_arsen', 'admin_group', 'admin_squadron'];

/**
 * Check if a role is any admin variant
 */
const isAdmin = (role) => ADMIN_ROLES.includes(role);

/**
 * Authorize middleware - checks if user has required role(s)
 * @param {...string} roles - Required roles (user must have one of them)
 * @returns {Function} Express middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - No user information',
        code: 'UNAUTHORIZED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Access denied. Required roles: ${roles.join(', ')}`,
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

/**
 * Authorize any admin role
 */
const requireAdmin = (req, res, next) => {
  if (!isAdmin(req.user?.role)) {
    return res.status(403).json({
      status: 'error',
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

/**
 * Authorize super admin only (full system access)
 */
const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'System administrator access required',
      code: 'SUPER_ADMIN_REQUIRED'
    });
  }
  next();
};

/**
 * Authorize admin or admin_arsen (e.g. reservist mutations scoped to ARSEN)
 * Allows: admin, admin_arsen
 */
const requireAdminArsenOrHigher = (req, res, next) => {
  const allowed = ['admin', 'admin_arsen'];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({
      status: 'error',
      message: 'Admin or ARSEN admin access required',
      code: 'ADMIN_ARSEN_REQUIRED'
    });
  }
  next();
};

/**
 * Check ownership - user can only access their own resources
 * @param {string} userIdField - Field name in request (params or body) containing user ID
 * @returns {Function} Express middleware
 */
const checkOwnership = (userIdField = 'user_id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
        code: 'UNAUTHORIZED'
      });
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField];

    if (!isAdmin(req.user.role) && resourceUserId !== String(req.user.id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied - You can only access your own resources',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

/**
 * Returns scope filter conditions for the current user.
 * Kept for backward compatibility (e.g. dashboards/reports that intentionally
 * want to pre-aggregate numbers only within a user's scope). Prefer
 * userCanManageScope() + attachCanManage() for list/detail endpoints where
 * out-of-scope rows should still be VISIBLE, just read-only.
 */
function getUserScopeFilter(user, columns) {
  const conditions = [];
  const params = [];

  if (!user || user.role === 'admin') {
    return { conditions, params }; // full access
  }

  const col = columns || {};

  if (user.scope_squadron_id) {
    const c = col.squadron || 'squadron_id';
    conditions.push(`${c} = ?`);
    params.push(user.scope_squadron_id);
  } else if (user.scope_group_id) {
    const c = col.group || 'group_id';
    conditions.push(`${c} = ?`);
    params.push(user.scope_group_id);
  } else if (user.scope_arsen_id) {
    const c = col.arsen || 'arsen_id';
    conditions.push(`${c} = ?`);
    params.push(user.scope_arsen_id);
  }

  return { conditions, params };
}

/**
 * Middleware factory that enforces data scoping on list endpoints.
 * Non-admin users are automatically restricted to their scope.
 * Reservists are blocked (they use /my-* self-service endpoints).
 *
 * @param {object} options
 * @param {string} options.entityColumn - The column to filter on (e.g. 'ra.squadron_id')
 * @param {boolean} options.blockReservist - If true (default), block reservist role entirely
 */
function enforceScope(options = {}) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    // Reservists should not access list endpoints (they use /my-* routes)
    if (req.user.role === 'reservist' && options.blockReservist !== false) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Use self-service endpoints.',
        code: 'USE_SELF_SERVICE'
      });
    }

    // Admin sees everything - no filter needed
    if (req.user.role === 'admin') {
      req.scopeFilter = null;
      return next();
    }

    // Unit admin: build scope filter
    const { conditions, params } = getUserScopeFilter(req.user);
    if (conditions.length === 0) {
      req.scopeFilter = null;
    } else {
      req.scopeFilter = { where: conditions.join(' OR '), params };
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────
// New: scope-containment engine (visible-but-read-only model)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resolve which hierarchy scope (arsen/group/squadron) an existing entity
 * belongs to, so we can check whether a scoped admin is allowed to touch it.
 * Returns null if the entity does not exist.
 *
 * @param {'arsen'|'group'|'squadron'|'reservist'} entityType
 * @param {number|string} id
 * @param {object} db - the mysql2 pool/connection (passed in to avoid a
 *   hard require path assumption; pass your existing `../config/database`)
 */
async function resolveEntityScope(entityType, id, db) {
  switch (entityType) {
    case 'arsen': {
      const [rows] = await db.query('SELECT id FROM arsens WHERE id = ?', [id]);
      if (!rows.length) return null;
      return { arsen_id: rows[0].id, group_id: null, squadron_id: null };
    }
    case 'group': {
      const [rows] = await db.query('SELECT id, arsen_id FROM `groups` WHERE id = ?', [id]);
      if (!rows.length) return null;
      return { arsen_id: rows[0].arsen_id, group_id: rows[0].id, squadron_id: null };
    }
    case 'squadron': {
      const [rows] = await db.query(
        `SELECT s.id, s.group_id, g.arsen_id
         FROM squadron s
         LEFT JOIN \`groups\` g ON s.group_id = g.id
         WHERE s.id = ?`,
        [id]
      );
      if (!rows.length) return null;
      return { arsen_id: rows[0].arsen_id, group_id: rows[0].group_id, squadron_id: rows[0].id };
    }
    case 'reservist': {
      // Uses the reservist's primary assignment to place them in the hierarchy
      const [rows] = await db.query(
        `SELECT ra.squadron_id, ra.group_id,
                COALESCE(g1.arsen_id, g2.arsen_id) AS arsen_id
         FROM reservist_assignments ra
         LEFT JOIN squadron s ON ra.squadron_id = s.id
         LEFT JOIN \`groups\` g1 ON s.group_id = g1.id
         LEFT JOIN \`groups\` g2 ON ra.group_id = g2.id
         WHERE ra.reservist_id = ? AND ra.is_primary = TRUE
         LIMIT 1`,
        [id]
      );
      if (!rows.length) return null;
      return {
        arsen_id: rows[0].arsen_id ?? null,
        group_id: rows[0].group_id ?? null,
        squadron_id: rows[0].squadron_id ?? null
      };
    }
    default:
      return null;
  }
}

/**
 * Pure containment check — does this user's assigned scope give them
 * management rights over the given entity? entityType matters: each level
 * manages what's BELOW it, not its own entity type (see module doc above).
 *
 * @param {object} user - req.user
 * @param {{arsen_id:?number, group_id:?number, squadron_id:?number}} entityScope
 * @param {'arsen'|'group'|'squadron'|'reservist'} entityType
 */
function userCanManageScope(user, entityScope, entityType) {
  if (!user || !entityScope) return false;
  if (user.role === 'admin') return true;

  if (user.role === 'admin_arsen') {
    if (entityType === 'arsen') return false; // cannot manage the ARSEN entity itself
    return !!user.scope_arsen_id && user.scope_arsen_id === entityScope.arsen_id;
  }

  if (user.role === 'admin_group') {
    if (entityType === 'arsen' || entityType === 'group') return false;
    return !!user.scope_group_id && user.scope_group_id === entityScope.group_id;
  }

  if (user.role === 'admin_squadron') {
    // Can manage reservists in their squadron, AND their own squadron
    // record itself (the bottom of the hierarchy has nothing below it to
    // delegate to, so squadron-level detail edits fall to this role).
    if (entityType !== 'squadron' && entityType !== 'reservist') return false;
    return !!user.scope_squadron_id && user.scope_squadron_id === entityScope.squadron_id;
  }

  // reservists never manage entities directly
  return false;
}

/**
 * Resolves the acting user's OWN position in the hierarchy — i.e. the
 * ancestor chain (arsen_id/group_id/squadron_id) that defines what they're
 * allowed to SEE, not just manage.
 *
 * Returns null for `admin` (unrestricted — no filter applied) and for any
 * user with no scope assigned (fails safe: treated as "sees nothing" by
 * callers, since a truthy-but-empty scope object would otherwise be
 * indistinguishable from "no restriction").
 *
 * - admin_arsen    -> { arsen_id, group_id: null, squadron_id: null }
 * - admin_group    -> { arsen_id (looked up), group_id, squadron_id: null }
 * - admin_squadron -> { arsen_id (looked up), group_id (looked up), squadron_id }
 * - reservist      -> { arsen_id (looked up), group_id (looked up), squadron_id (from primary assignment) }
 * - other          -> null
 *
 * @param {object} user - req.user
 * @param {object} db - mysql2 pool/connection
 */
async function getUserHierarchyScope(user, db) {
  if (!user || user.role === 'admin') return null;

  const reservistRoles = ['admin_arsen', 'admin_group', 'admin_squadron', 'reservist'];
  if (!reservistRoles.includes(user.role)) return null;

  if (user.role === 'admin_arsen') {
    if (!user.scope_arsen_id) return null;
    return { arsen_id: user.scope_arsen_id, group_id: null, squadron_id: null };
  }

  if (user.role === 'admin_group') {
    if (!user.scope_group_id) return null;
    return resolveEntityScope('group', user.scope_group_id, db);
  }

  if (user.role === 'admin_squadron') {
    if (!user.scope_squadron_id) return null;
    return resolveEntityScope('squadron', user.scope_squadron_id, db);
  }

  // reservist: resolve hierarchy from their primary assignment
  if (user.role === 'reservist') {
    const [reservistRows] = await db.query(
      'SELECT id FROM reservists WHERE user_id = ?',
      [user.id]
    );
    if (!reservistRows.length) return null;
    return resolveEntityScope('reservist', reservistRows[0].id, db);
  }

  return null;
}

/**
 * Middleware — resolves req.hierarchyScope for the current user.
 * `null` means "no restriction" (full admin). A non-null object means the
 * caller should filter/hide rows outside that scope. If a scoped role
 * somehow has no scope id assigned, req.hierarchyScope is set to an
 * impossible-match object ({ arsen_id: -1, group_id: -1, squadron_id: -1 })
 * so the route fails closed (shows nothing) instead of open (shows all).
 *
 * @param {object} [options]
 * @param {object} [options.db] - db module; defaults to require('../config/database')
 */
function attachHierarchyScope(options = {}) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized', code: 'UNAUTHORIZED' });
    }
    try {
      const db = options.db || require('../config/database');
      const scope = await getUserHierarchyScope(req.user, db);

      if (scope === null && req.user.role !== 'admin') {
        // Scoped role but nothing resolved (bad/missing assignment) — fail closed.
        req.hierarchyScope = { arsen_id: -1, group_id: -1, squadron_id: -1 };
      } else {
        req.hierarchyScope = scope; // null for admin = unrestricted
      }

      next();
    } catch (error) {
      console.error('Error resolving hierarchy scope:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  };
}

/**
 * Middleware factory — authorize a mutation (create/update/delete) against
 * the hierarchy scope of the TARGET entity, instead of hiding it up front.
 *
 * Usage for update/delete (entity already exists):
 *   router.put('/:id', authorizeManageEntity('group'), ...)
 *
 * Usage for create (entity doesn't exist yet — check against the declared
 * parent instead):
 *   router.post('/', authorizeManageEntity('group', {
 *     getNewParentScope: async (req, db) => {
 *       const [[g]] = await db.query('SELECT arsen_id FROM arsens WHERE id = ?', [req.body.arsen_id]);
 *       return g ? { arsen_id: req.body.arsen_id, group_id: null, squadron_id: null } : null;
 *     }
 *   }), ...)
 *
 * @param {'arsen'|'group'|'squadron'|'reservist'} entityType
 * @param {object} [options]
 * @param {(req) => (string|number)} [options.getId] - defaults to req.params.id
 * @param {(req, db) => Promise<object|null>} [options.getNewParentScope] - for creates
 * @param {object} [options.db] - db module; defaults to require('../config/database')
 */
function authorizeManageEntity(entityType, options = {}) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized', code: 'UNAUTHORIZED' });
    }
    if (!isAdmin(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Admin access required', code: 'ADMIN_REQUIRED' });
    }
    // Super admin skips the DB round-trip entirely
    if (req.user.role === 'admin') return next();

    try {
      const db = options.db || require('../config/database');
      let entityScope;

      if (options.getNewParentScope) {
        entityScope = await options.getNewParentScope(req, db);
      } else {
        const id = options.getId ? options.getId(req) : req.params.id;
        entityScope = await resolveEntityScope(entityType, id, db);
      }

      if (!entityScope) {
        return res.status(404).json({ status: 'error', message: `${entityType} not found`, code: 'NOT_FOUND' });
      }

      if (!userCanManageScope(req.user, entityScope, entityType)) {
        return res.status(403).json({
          status: 'error',
          message: `You can only manage ${entityType}s within your assigned scope`,
          code: 'OUT_OF_SCOPE'
        });
      }

      req.entityScope = entityScope;
      next();
    } catch (error) {
      console.error(`Error authorizing ${entityType} management:`, error);
      res.status(500).json({ status: 'error', message: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  };
}

/**
 * Annotate a list of rows with a `can_manage` boolean based on each row's
 * own scope — use this on GET list/detail endpoints so out-of-scope rows
 * stay VISIBLE but the frontend can render them read-only.
 *
 * @param {Array<object>} rows
 * @param {object} user
 * @param {(row: object) => {arsen_id:?number, group_id:?number, squadron_id:?number}} getScope
 * @param {'arsen'|'group'|'squadron'|'reservist'} entityType
 */
function attachCanManage(rows, user, getScope, entityType) {
  const isArray = Array.isArray(rows);
  const list = isArray ? rows : [rows];
  const result = list.map(row => ({
    ...row,
    can_manage: userCanManageScope(user, getScope(row), entityType)
  }));
  return isArray ? result : result[0];
}

module.exports = {
  authorize,
  requireAdmin,
  requireSuperAdmin,
  requireAdminArsenOrHigher,
  checkOwnership,
  isAdmin,
  ADMIN_ROLES,
  getUserScopeFilter,
  enforceScope,
  // new scope-containment engine
  resolveEntityScope,
  userCanManageScope,
  authorizeManageEntity,
  attachCanManage,
  // visibility (hide-out-of-scope) engine
  getUserHierarchyScope,
  attachHierarchyScope,
};
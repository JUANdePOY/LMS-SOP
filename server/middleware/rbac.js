/**
 * RBAC (Role-Based Access Control) Middleware
 * Provides role-based authorization checks for routes
 * Supports granular admin roles: admin, admin_arsen, admin_group, admin_squadron
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
 * For unit admins, restricts to their assigned arsen/group/squadron.
 * Super admin (role==='admin') gets no restrictions.
 *
 * Supports multiple column name patterns via the `columns` parameter:
 *   Default: { squadron: 'squadron_id', group: 'group_id', arsen: 'arsen_id' }
 *
 * Usage example:
 *   const { conditions, params } = getUserScopeFilter(req.user);
 *   // Append to existing WHERE with AND:
 *   if (conditions.length) where += ' AND (' + conditions.join(' OR ') + ')';
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
 * For reservist role, returns 403 (they should not access list endpoints).
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

module.exports = {
  authorize,
  requireAdmin,
  requireSuperAdmin,
  checkOwnership,
  isAdmin,
  ADMIN_ROLES,
  getUserScopeFilter,
  enforceScope,
};

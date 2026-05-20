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

module.exports = {
  authorize,
  requireAdmin,
  requireSuperAdmin,
  checkOwnership,
  isAdmin,
  ADMIN_ROLES,
};

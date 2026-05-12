/**
 * RBAC (Role-Based Access Control) Middleware
 * Provides role-based authorization checks for routes
 */

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

    // Check if user has one of the required roles
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
 * Authorize admin only
 * Shorthand for authorize('admin')
 */
const requireAdmin = (req, res, next) => {
  return authorize('admin')(req, res, next);
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
    
    // Admin can access all, others only their own
    if (req.user.role !== 'admin' && resourceUserId !== String(req.user.id)) {
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
  checkOwnership
};

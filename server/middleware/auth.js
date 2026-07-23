const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const LMS_ROLES = ['super_admin', 'admin', 'department_head', 'employee'];

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Access token required',
      code: 'NO_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const [users] = await db.query(
      'SELECT id, role, is_active, department_id, full_name, email, position_title, employee_id FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({
        status: 'error',
        message: 'User account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    req.user = {
      id: user.id,
      role: user.role,
      department_id: user.department_id,
      full_name: user.full_name,
      email: user.email,
      position_title: user.position_title,
      employee_id: user.employee_id,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(403).json({
      status: 'error',
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
}

async function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await db.query(
      'SELECT id, role, is_active, department_id, full_name, email FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length > 0 && users[0].is_active) {
      req.user = {
        id: users[0].id,
        role: users[0].role,
        department_id: users[0].department_id,
        full_name: users[0].full_name,
        email: users[0].email,
      };
    }
  } catch {
    // Optional auth: invalid token is ignored
  }

  next();
}

function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Super admin access required',
      code: 'SUPER_ADMIN_REQUIRED'
    });
  }
  next();
}

function requireAdmin(req, res, next) {
  const adminRoles = ['super_admin', 'admin', 'department_head'];
  if (!adminRoles.includes(req.user?.role)) {
    return res.status(403).json({
      status: 'error',
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
}

function requireDepartmentHead(req, res, next) {
  if (req.user?.role !== 'department_head' && req.user?.role !== 'super_admin' && req.user?.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Department head access required',
      code: 'DEPT_HEAD_REQUIRED'
    });
  }
  next();
}

function authorize(...roles) {
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
}

function isAdminRole(role) {
  return ['super_admin', 'admin', 'department_head'].includes(role);
}

module.exports = {
  authenticateToken,
  optionalAuthenticateToken,
  requireSuperAdmin,
  requireAdmin,
  requireDepartmentHead,
  authorize,
  isAdminRole,
  JWT_SECRET,
  LMS_ROLES,
};
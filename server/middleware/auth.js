const jwt = require('jsonwebtoken');
const db = require('../config/database');

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Access token required',
      code: 'NO_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user still exists and is active
    let users;
    try {
      [users] = await db.query(
        'SELECT id, role, is_active FROM users WHERE id = ?',
        [decoded.userId]
      );
    } catch (dbError) {
      return res.status(500).json({
        status: 'error',
        message: 'Database error',
        code: 'DB_ERROR'
      });
    }

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

    // Attach user info to request
    req.user = {
      id: user.id,
      role: user.role,
      id_number: decoded.id_number
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
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

/**
 * Middleware to check if user is admin or the resource owner
 */
const requireAdminOrOwner = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied',
      code: 'ACCESS_DENIED'
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireAdminOrOwner,
  JWT_SECRET
};
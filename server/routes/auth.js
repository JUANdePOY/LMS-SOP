const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { comparePassword, generateToken, hashPassword } = require('../app/auth');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .trim()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    const [results] = await db.query(
      'SELECT u.*, d.name AS department_name FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.email = ?',
      [email]
    );

    if (!results || results.length === 0) {
      console.warn('Login failed: user not found', { email, dbHost: process.env.DB_HOST, dbName: process.env.DB_NAME });
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = results[0];

    if (!user.is_active) {
      console.warn('Login failed: deactivated account', { email, userId: user.id });
      return res.status(403).json({
        status: 'error',
        message: 'User account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    const rawHash = String(user.password_hash);
    const isPasswordValid = await comparePassword(password, rawHash);
    const hashSelfTest = await bcrypt.compare('password123', rawHash);

    if (!isPasswordValid) {
      console.warn('Login failed: invalid password', {
        email,
        userId: user.id,
        receivedPassword: JSON.stringify(password),
        receivedPasswordLength: password?.length,
        hasHash: !!rawHash,
        hashLength: rawHash.length,
        hashPrefix: rawHash.slice(0, 30),
        hashSelfTestMatch: hashSelfTest,
        hashFull: rawHash
      });
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    await db.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    logAudit({
      user_id: user.id,
      action: 'user.login',
      entity_type: 'user',
      entity_id: user.id,
      new_values: { email: user.email, role: user.role }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          department_id: user.department_id,
          department_name: user.department_name,
          position_title: user.position_title,
          employee_id: user.employee_id,
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
});

router.post('/logout', authenticateToken, (req, res) => {
  try {
    logAudit({
      user_id: req.user.id,
      action: 'user.logout',
      entity_type: 'user',
      entity_id: req.user.id
    });

    res.status(200).json({
      status: 'success',
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

router.post('/register', authenticateToken, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .isIn(['super_admin', 'admin', 'department_head', 'employee'])
    .withMessage('Role must be super_admin, admin, department_head, or employee'),
  body('full_name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Full name is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only super admins can create user accounts',
        code: 'ADMIN_ONLY'
      });
    }

    const { full_name, email, password, role, department_id, position_title, employee_id, contact_number, employment_status, date_hired, birthdate, address } = req.body;

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    const passwordHash = await hashPassword(password);

    const [insertResults] = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, department_id, position_title, employee_id, contact_number, employment_status, date_hired, birthdate, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, email, passwordHash, role, department_id ?? null, position_title ?? null, employee_id ?? null, contact_number ?? null, employment_status ?? 'Regular', date_hired ?? null, birthdate ?? null, address ?? null]
    );

    logAudit({
      user_id: req.user.id,
      action: 'user.created',
      entity_type: 'user',
      entity_id: insertResults.insertId,
      new_values: { email, role }
    });

    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: {
        userId: insertResults.insertId,
        email,
        role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT u.*, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!results || results.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'NOT_FOUND'
      });
    }

    const user = results[0];
    res.status(200).json({
      status: 'success',
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name,
        position_title: user.position_title,
        employee_id: user.employee_id,
        contact_number: user.contact_number,
        employment_status: user.employment_status,
        date_hired: user.date_hired,
        birthdate: user.birthdate,
        address: user.address,
        avatar_url: user.avatar_url,
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database error',
      code: 'DB_ERROR'
    });
  }
});

router.put('/profile', authenticateToken, [
  body('full_name').optional().trim().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('position_title').optional().trim(),
  body('contact_number').optional().trim(),
  body('employment_status').optional().isIn(['Regular', 'Probationary', 'Contractual', 'Resigned/Terminated', 'Retired', 'On Leave']),
  body('date_hired').optional().isISO8601(),
  body('birthdate').optional().isISO8601(),
  body('address').optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const updates = {};
    const allowed = ['full_name', 'email', 'position_title', 'contact_number', 'employment_status', 'date_hired', 'birthdate', 'address'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No changes provided',
        code: 'VALIDATION_ERROR'
      });
    }

    if (updates.email) {
      const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [updates.email, req.user.id]);
      if (existing.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'Email already in use',
          code: 'EMAIL_EXISTS'
        });
      }
    }

    await db.query(
      `UPDATE users SET ${Object.keys(updates).map(k => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...Object.values(updates), req.user.id]
    );

    logAudit({
      user_id: req.user.id,
      action: 'user.profile_updated',
      entity_type: 'user',
      entity_id: req.user.id,
      new_values: updates
    });

    res.json({ status: 'success', message: 'Profile updated' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
      code: 'DB_ERROR'
    });
  }
});

router.put('/profile/password', authenticateToken, [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const { current_password, new_password } = req.body;

    const [userResults] = await db.query(
      'SELECT id, password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!userResults || userResults.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'NOT_FOUND'
      });
    }

    const user = userResults[0];
    const isCurrentValid = await comparePassword(current_password, user.password_hash);

    if (!isCurrentValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect',
        code: 'INVALID_PASSWORD'
      });
    }

    const newPasswordHash = await hashPassword(new_password);
    await db.query(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, req.user.id]
    );

    logAudit({
      user_id: req.user.id,
      action: 'user.password_changed',
      entity_type: 'user',
      entity_id: req.user.id
    });

    res.json({ status: 'success', message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password',
      code: 'DB_ERROR'
    });
  }
});

module.exports = router;
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requireSuperAdmin, requireAdmin, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const authModel = require('../models/authModel');
const departmentModel = require('../models/departmentModel');

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, role, department_id, employment_status, page = 1, limit = 50 } = req.query;
    const result = await authModel.listUsers({
      search: search || undefined,
      role: role || undefined,
      department_id: department_id ? parseInt(department_id) : undefined,
      employment_status: employment_status || undefined,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    console.error('Users list error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch users', code: 'DB_ERROR' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await authModel.getStats();
    res.json({ status: 'success', data: stats });
  } catch (err) {
    console.error('User stats error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch user stats', code: 'DB_ERROR' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await authModel.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'NOT_FOUND' });
    }
    const { password_hash, ...safeUser } = user;
    res.json({ status: 'success', data: safeUser });
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch user', code: 'DB_ERROR' });
  }
});

router.post('/', [
  body('full_name').trim().isLength({ min: 2 }).withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['super_admin', 'admin', 'department_head', 'employee']).withMessage('Invalid role'),
  body('department_id').optional().isInt(),
  body('position_title').optional().trim(),
  body('employee_id').optional().trim(),
  body('contact_number').optional().trim(),
  body('employment_status').optional().isIn(['Regular', 'Probationary', 'Contractual', 'Resigned/Terminated', 'Retired', 'On Leave']),
  body('date_hired').optional().isISO8601(),
  body('birthdate').optional().isISO8601(),
  body('address').optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ status: 'error', message: 'Only super admins can create users', code: 'ADMIN_ONLY' });
    }

    const { full_name, email, password, role, department_id, position_title, employee_id, contact_number, employment_status, date_hired, birthdate, address } = req.body;

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Email already registered', code: 'EMAIL_EXISTS' });
    }

    const passwordHash = await require('../app/auth').hashPassword(password);

    const userId = await authModel.create({
      full_name, email, password_hash: passwordHash, role,
      department_id: department_id ? parseInt(department_id) : null,
      position_title, employee_id, contact_number, employment_status,
      date_hired: date_hired || null, birthdate: birthdate || null, address: address || null,
    });

    logAudit({
      user_id: req.user.id,
      action: 'user.created',
      entity_type: 'user',
      entity_id: userId,
      new_values: { email, role }
    });

    res.status(201).json({ status: 'success', message: 'User created successfully', data: { id: userId, email, role } });
  } catch (err) {
    console.error('User create error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create user', code: 'DB_ERROR' });
  }
});

router.put('/:id', [
  body('full_name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['super_admin', 'admin', 'department_head', 'employee']),
  body('department_id').optional().isInt(),
  body('position_title').optional().trim(),
  body('employee_id').optional().trim(),
  body('contact_number').optional().trim(),
  body('employment_status').optional().isIn(['Regular', 'Probationary', 'Contractual', 'Resigned/Terminated', 'Retired', 'On Leave']),
  body('date_hired').optional().isISO8601(),
  body('birthdate').optional().isISO8601(),
  body('address').optional(),
  body('is_active').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const userId = parseInt(req.params.id);
    const targetUser = await authModel.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'NOT_FOUND' });
    }

    if (req.user.role !== 'super_admin' && req.user.id !== userId) {
      return res.status(403).json({ status: 'error', message: 'Can only update your own profile', code: 'FORBIDDEN' });
    }

    if (req.body.email && req.body.email !== targetUser.email) {
      const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [req.body.email, userId]);
      if (existing.length > 0) {
        return res.status(409).json({ status: 'error', message: 'Email already in use', code: 'EMAIL_EXISTS' });
      }
    }

    const updates = {};
    const allowed = ['full_name', 'email', 'role', 'department_id', 'position_title', 'employee_id', 'contact_number', 'employment_status', 'date_hired', 'birthdate', 'address', 'is_active'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No changes provided', code: 'VALIDATION_ERROR' });
    }

    await authModel.update(userId, updates);

    logAudit({
      user_id: req.user.id,
      action: 'user.updated',
      entity_type: 'user',
      entity_id: userId,
      new_values: updates
    });

    res.json({ status: 'success', message: 'User updated successfully' });
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update user', code: 'DB_ERROR' });
  }
});

router.put('/:id/password', [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const userId = parseInt(req.params.id);
    const { current_password, new_password } = req.body;

    if (req.user.role !== 'super_admin' && req.user.id !== userId) {
      return res.status(403).json({ status: 'error', message: 'Can only change your own password', code: 'FORBIDDEN' });
    }

    const targetUser = await authModel.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'NOT_FOUND' });
    }

    const isCurrentValid = await require('../app/auth').comparePassword(current_password, targetUser.password_hash);
    if (!isCurrentValid) {
      return res.status(401).json({ status: 'error', message: 'Current password is incorrect', code: 'INVALID_PASSWORD' });
    }

    const newPasswordHash = await require('../app/auth').hashPassword(new_password);
    await authModel.updatePassword(userId, newPasswordHash);

    logAudit({
      user_id: req.user.id,
      action: 'user.password_changed',
      entity_type: 'user',
      entity_id: userId
    });

    res.json({ status: 'success', message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to change password', code: 'DB_ERROR' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ status: 'error', message: 'Only super admins can deactivate users', code: 'ADMIN_ONLY' });
    }

    const targetUser = await authModel.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'NOT_FOUND' });
    }

    if (targetUser.role === 'super_admin') {
      return res.status(403).json({ status: 'error', message: 'Cannot deactivate super admin users', code: 'CANNOT_DEACTIVATE_ADMIN' });
    }

    await authModel.update(userId, { is_active: false });

    logAudit({
      user_id: req.user.id,
      action: 'user.deactivated',
      entity_type: 'user',
      entity_id: userId,
      old_values: { is_active: true, role: targetUser.role }
    });

    res.json({ status: 'success', message: 'User deactivated successfully' });
  } catch (err) {
    console.error('User deactivate error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to deactivate user', code: 'DB_ERROR' });
  }
});

module.exports = router;
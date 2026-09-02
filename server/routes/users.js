const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireSuperAdmin, requireAdmin, authorize } = require('../middleware/auth');
const { requireBusinessScope, requireDepartmentScope, requirePermission } = require('../middleware/scope');
const { logAudit } = require('../utils/auditLogger');
const authModel = require('../models/authModel');
const departmentModel = require('../models/departmentModel');

const router = express.Router();

// Only these roles are tied to a department (SOP). Admins and super admins are
// business-level and must not be assigned to any department.
const DEPARTMENT_SCOPED_ROLES = ['department_head', 'employee'];

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, role, department_id, business_id, employment_status, page = 1, limit = 50 } = req.query;

    let effectiveBusinessId = business_id ? parseInt(business_id) : undefined;
    let effectiveDepartmentId = department_id ? parseInt(department_id) : undefined;

    if (req.user.role === 'department_head') {
      if (!req.user.department_id) {
        return res.status(403).json({ status: 'error', message: 'No department assigned', code: 'NO_DEPARTMENT_SCOPE' });
      }
      effectiveDepartmentId = req.user.department_id;
      effectiveBusinessId = req.user.business_id;
    } else if (req.user.role !== 'super_admin') {
      effectiveBusinessId = req.user.business_id;
    }

    const result = await authModel.listUsers({
      search: search || undefined,
      role: role || undefined,
      department_id: effectiveDepartmentId,
      business_id: effectiveBusinessId,
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

// GET /api/users/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    const validPeriods = ['all', 'week', 'month'];

    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid period. Use: all, week, month',
        code: 'VALIDATION_ERROR'
      });
    }

    let effectiveBusinessId = undefined;
    let effectiveDepartmentId = undefined;

    if (req.user.role === 'department_head') {
      if (!req.user.department_id) {
        return res.status(403).json({ status: 'error', message: 'No department assigned', code: 'NO_DEPARTMENT_SCOPE' });
      }
      effectiveDepartmentId = req.user.department_id;
      effectiveBusinessId = req.user.business_id;
    } else if (req.user.role !== 'super_admin') {
      // Regular employees should only see their own department's leaderboard,
      // not everyone across the business.
      if (req.user.department_id) {
        effectiveDepartmentId = req.user.department_id;
      }
      effectiveBusinessId = req.user.business_id;
    }

    const data = await authModel.getUserLeaderboard({
      period,
      business_id: effectiveBusinessId,
      department_id: effectiveDepartmentId,
      limit: 20,
    });

    res.json({ status: 'success', data, period });
  } catch (err) {
    console.error('User leaderboard error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch leaderboard', code: 'DB_ERROR' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid user id', code: 'VALIDATION_ERROR' });
    }
    const [rows] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.employee_id, u.role, u.department_id, u.business_id,
              u.position_title, u.contact_number, u.employment_status, u.date_hired, u.birthdate,
              u.address, u.bio, u.avatar_url, u.cover_photo_url AS cover_url, u.is_active, u.created_at,
              d.name AS department_name, b.business_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN businesses b ON u.business_id = b.id
       WHERE u.id = ?`,
      [userId]
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'NOT_FOUND' });
    }

    if (req.user.role !== 'super_admin' && req.user.business_id !== user.business_id) {
      return res.status(403).json({ status: 'error', message: 'Access denied to this user', code: 'BUSINESS_SCOPE_DENIED' });
    }

    const { password_hash, ...safeUser } = user;
    res.json({ status: 'success', data: safeUser });
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch user', code: 'DB_ERROR' });
  }
});

router.post('/', requireAdmin, [
  body('full_name').trim().isLength({ min: 2 }).withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['super_admin', 'admin', 'department_head', 'employee']).withMessage('Invalid role'),
  body('department_id').optional().isInt(),
  body('business_id').optional().isInt(),
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

    const { full_name, email, password, role, department_id, business_id, position_title, employee_id, contact_number, employment_status, date_hired, birthdate, address } = req.body;

    // Only department-scoped roles (department_head, employee) may carry a
    // department_id. Admins and super admins are business-level and must not be
    // assigned to any department — reject the request rather than silently
    // storing a meaningless department reference.
    if (department_id && !DEPARTMENT_SCOPED_ROLES.includes(role)) {
      return res.status(400).json({ status: 'error', message: 'Admin and super admin roles cannot be assigned to a department', code: 'DEPARTMENT_NOT_ALLOWED' });
    }

    // Department Heads are scoped to their own department(s) — they can only
    // create users in the departments they own, within their business.
    if (req.user.role === 'department_head') {
      const actorDeptIds = req.user?.scoped_department_ids?.length
        ? req.user.scoped_department_ids
        : (req.user.department_id ? [req.user.department_id] : []);
      if (actorDeptIds.length === 0) {
        return res.status(403).json({ status: 'error', message: 'Your account is not assigned to a department', code: 'NO_DEPARTMENT_SCOPE' });
      }
      if (department_id && !actorDeptIds.includes(parseInt(department_id, 10))) {
        return res.status(403).json({ status: 'error', message: 'Cannot create users in another department', code: 'DEPARTMENT_SCOPE_DENIED' });
      }
    }

    if (req.user.role !== 'super_admin') {
      if (!req.user.business_id) {
        return res.status(403).json({ status: 'error', message: 'Your account is not assigned to a business', code: 'NO_BUSINESS_SCOPE' });
      }
      if (business_id && parseInt(business_id) !== req.user.business_id) {
        return res.status(403).json({ status: 'error', message: 'Cannot create users in another business', code: 'BUSINESS_SCOPE_DENIED' });
      }
      // Admins can only create department_head and employee users — they cannot
      // create other admin or super_admin accounts.
      if (role === 'super_admin') {
        return res.status(403).json({ status: 'error', message: 'Cannot assign super_admin role', code: 'ROLE_ASSIGN_DENIED' });
      }
      if (role === 'admin') {
        return res.status(403).json({ status: 'error', message: 'Cannot assign admin role', code: 'ROLE_ASSIGN_DENIED' });
      }
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Email already registered', code: 'EMAIL_EXISTS' });
    }

    const passwordHash = await require('../app/auth').hashPassword(password);

    const finalBusinessId = req.user.role === 'super_admin' ? (business_id ? parseInt(business_id) : null) : req.user.business_id;

    const userId = await authModel.create({
      full_name, email, password_hash: passwordHash, role,
      department_id: department_id ? parseInt(department_id) : null,
      business_id: finalBusinessId,
      position_title, employee_id, contact_number, employment_status,
      date_hired: date_hired || null, birthdate: birthdate || null, address: address || null,
    });
        // Assign default onboarding SOPs
        try {
          const onboardingService = require('../services/sopOnboardingService');
          await onboardingService.assignOnboardingSopsToUser(userId);
        } catch (onboardingErr) {
          console.error('[Bulk Upload] Onboarding assignment failed for', email, onboardingErr);
        }

    logAudit({
      user_id: req.user.id,
      action: 'user.created',
      entity_type: 'user',
      entity_id: userId,
      new_values: { email, role, business_id: finalBusinessId }
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
  body('business_id').optional().isInt(),
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

    const isSelf = req.user.id === userId;
    const canManageOthers = ['super_admin', 'admin', 'department_head'].includes(req.user.role);
    if (!isSelf && !canManageOthers) {
      return res.status(403).json({ status: 'error', message: 'Can only update your own profile', code: 'FORBIDDEN' });
    }

    if (req.body.email && req.body.email !== targetUser.email) {
      const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [req.body.email, userId]);
      if (existing.length > 0) {
        return res.status(409).json({ status: 'error', message: 'Email already in use', code: 'EMAIL_EXISTS' });
      }
    }

    const updates = {};
    const allowed = ['full_name', 'email', 'role', 'department_id', 'business_id', 'position_title', 'employee_id', 'contact_number', 'employment_status', 'date_hired', 'birthdate', 'address', 'is_active'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Only department-scoped roles may carry a department_id. The effective
    // role is the one being updated to (if provided) or the target user's
    // existing role — admins/super admins must not be assigned to a department.
    const effectiveRole = updates.role !== undefined ? updates.role : targetUser.role;
    if (updates.department_id && !DEPARTMENT_SCOPED_ROLES.includes(effectiveRole)) {
      return res.status(400).json({ status: 'error', message: 'Admin and super admin roles cannot be assigned to a department', code: 'DEPARTMENT_NOT_ALLOWED' });
    }
    // When the effective role is business-level, never store a department_id
    // (even if a stale value was already on the record).
    if (!DEPARTMENT_SCOPED_ROLES.includes(effectiveRole)) {
      updates.department_id = null;
    }

    // Admins cannot manage other admin/super_admin accounts, and they cannot
    // promote anyone to an admin or super_admin role. Super admins keep full
    // control; the actor's own admin account can still be edited by themselves.
    if (req.user.role === 'admin') {
      if (!isSelf && (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
        return res.status(403).json({ status: 'error', message: 'Cannot edit other admin accounts', code: 'ADMIN_SCOPE_DENIED' });
      }
      if (updates.role === 'admin' || updates.role === 'super_admin') {
        return res.status(403).json({ status: 'error', message: 'Cannot assign admin or super_admin role', code: 'ROLE_ASSIGN_DENIED' });
      }
    }

    // Department Heads are scoped to their own department(s) — they cannot
    // manage users outside their departments, and cannot promote anyone to an
    // admin or super_admin role.
    if (req.user.role === 'department_head') {
      const actorDeptIds = req.user?.scoped_department_ids?.length
        ? req.user.scoped_department_ids
        : (req.user.department_id ? [req.user.department_id] : []);
      if (actorDeptIds.length === 0) {
        return res.status(403).json({ status: 'error', message: 'Your account is not assigned to a department', code: 'NO_DEPARTMENT_SCOPE' });
      }
      if (!actorDeptIds.includes(targetUser.department_id)) {
        return res.status(403).json({ status: 'error', message: 'Cannot edit users outside your department', code: 'DEPARTMENT_SCOPE_DENIED' });
      }
      if (updates.department_id && !actorDeptIds.includes(parseInt(updates.department_id, 10))) {
        return res.status(403).json({ status: 'error', message: 'Cannot reassign users to another department', code: 'DEPARTMENT_SCOPE_DENIED' });
      }
      if (updates.role === 'admin' || updates.role === 'super_admin') {
        return res.status(403).json({ status: 'error', message: 'Cannot assign admin or super_admin role', code: 'ROLE_ASSIGN_DENIED' });
      }
      if (updates.role === 'department_head' && targetUser.role !== 'department_head') {
        return res.status(403).json({ status: 'error', message: 'Cannot assign department_head role', code: 'ROLE_ASSIGN_DENIED' });
      }
    }

    if (req.user.role !== 'super_admin') {
      if (updates.business_id !== undefined && updates.business_id !== null && updates.business_id !== req.user.business_id) {
        return res.status(403).json({ status: 'error', message: 'Cannot reassign users to another business', code: 'BUSINESS_SCOPE_DENIED' });
      }
      updates.business_id = req.user.business_id;
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

    const isSelfPw = req.user.id === userId;
    const canManageOthersPw = ['super_admin', 'admin'].includes(req.user.role);
    if (!isSelfPw && !canManageOthersPw) {
      return res.status(403).json({ status: 'error', message: 'Can only change your own password', code: 'FORBIDDEN' });
    }

    const targetUser = await authModel.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'NOT_FOUND' });
    }

    // Admins cannot manage other admin/super_admin accounts — including
    // password resets — even though they can otherwise manage other users.
    if (req.user.role === 'admin' && !isSelfPw &&
        (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
      return res.status(403).json({ status: 'error', message: 'Cannot edit other admin accounts', code: 'ADMIN_SCOPE_DENIED' });
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

router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      const targetUser = await authModel.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ status: 'error', message: 'User not found', code: 'NOT_FOUND' });
      }

      if (targetUser.role === 'super_admin') {
        return res.status(403).json({ status: 'error', message: 'Cannot deactivate super admin users', code: 'CANNOT_DEACTIVATE_ADMIN' });
      }
      // Admins cannot deactivate other admin accounts (or their own admin
      // account — only super admins can manage admin roles).
      if (req.user.role === 'admin' && targetUser.role === 'admin') {
        return res.status(403).json({ status: 'error', message: 'Cannot deactivate admin users', code: 'CANNOT_DEACTIVATE_ADMIN' });
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

const multer = require('multer');
const Excel = require('exceljs');

const userUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel/CSV files are allowed'));
    }
  }
});

router.post('/bulk-upload', authenticateToken, requireSuperAdmin, userUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded', code: 'NO_FILE' });
    }

    const defaultPassword = (req.body.password || '').trim();
    const defaultRole = (req.body.role || 'employee').trim();

    if (!defaultPassword || defaultPassword.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Default password must be at least 8 characters', code: 'INVALID_PASSWORD' });
    }

    const [depts] = await db.query('SELECT id, name FROM departments');
    const deptMap = {};
    depts.forEach(d => { deptMap[String(d.name).toLowerCase()] = d.id; });

    const [businesses] = await db.query('SELECT id, business_name, business_code FROM businesses');
    const businessMap = {};
    businesses.forEach(b => {
      businessMap[String(b.business_name).toLowerCase()] = b.id;
      businessMap[String(b.business_code).toLowerCase()] = b.id;
    });

    const passwordHash = await require('../app/auth').hashPassword(defaultPassword);

    const workbook = new Excel.Workbook();
    if (req.file.mimetype === 'text/csv') {
      const ws = workbook.addWorksheet('CSV');
      const rows = req.file.buffer.toString('utf8').trim().split('\n');
      rows.forEach(r => ws.addRow(r.split(',')));
    } else {
      await workbook.xlsx.load(req.file.buffer);
    }

    if (!workbook.worksheets.length) {
      return res.status(400).json({ status: 'error', message: 'Empty Excel file', code: 'INVALID_FILE' });
    }

    const ws = workbook.worksheets[0];
    const raw = [];
    ws.eachRow({ includeEmpty: true }, row => raw.push(row.values.slice(1)));

    let headerIdx = 0;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] && raw[i].some(c => c && typeof c === 'string' && /full\s*name|email|employee\s*id|department/i.test(c))) {
        headerIdx = i;
        break;
      }
    }

    const headers = raw[headerIdx] || [];
    const rows = raw.slice(headerIdx + 1);

    const headerLookup = {};
    headers.forEach((h, idx) => {
      if (h != null) {
        const k = String(h).trim().toLowerCase();
        headerLookup[k] = idx;
        headerLookup[k.replace(/[\s/()]+/g, '')] = idx;
      }
    });

    const get = (name) => {
      const k = String(name).trim().toLowerCase();
      const idx = headerLookup[k] ?? headerLookup[k.replace(/[\s/()]+/g, '')];
      if (idx == null) return '';
      const val = rows.map(r => r[idx]).filter(v => v != null);
      return val.length ? String(val[0]).trim() : '';
    };

    const formatDate = (val) => {
      if (!val) return null;
      if (val instanceof Date && !isNaN(val)) return val.toLocaleDateString('en-CA');
      const s = String(val).trim();
      if (!s) return null;
      const d = new Date(s);
      if (!isNaN(d)) return d.toLocaleDateString('en-CA');
      return s;
    };

    const cleanRole = ['super_admin', 'admin', 'department_head', 'employee'].includes(defaultRole) ? defaultRole : 'employee';

    let success = 0, failed = 0;
    const results = [];

    for (const row of rows) {
      try {
        const fullName = get('Full Name') || get('Fullname') || get('Name');
        const email = get('Email Address') || get('Email');
        if (!fullName || !email) {
          failed++;
          results.push({ row, error: 'Missing full name or email' });
          continue;
        }

        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existing.length > 0) {
          failed++;
          results.push({ row, error: `Email ${email} already exists` });
          continue;
        }

        const employeeId = get('Employee ID') || null;
        const deptName = get('Department');
        let departmentId = deptName ? (deptMap[deptName.toLowerCase()] || null) : null;
        // Admins / super admins are business-level and must not be assigned to
        // a department — drop any department column from the upload for them.
        if (departmentId && !DEPARTMENT_SCOPED_ROLES.includes(cleanRole)) {
          departmentId = null;
        }
        const businessName = get('Business') || get('Business Name') || get('business_name');
        const businessId = businessName ? (businessMap[businessName.toLowerCase()] || null) : null;
        const positionTitle = get('Position/Job Title') || get('Position Title') || get('Position') || null;
        const contactNumber = get('Contact Number') || get('Contact') || null;
        const employmentStatus = get('Employment Status') || 'Regular';
        const dateHired = formatDate(get('Date Hired') || get('DateHired'));
        const birthdate = formatDate(get('Birthdate') || get('Birth Date'));
        const address = get('Address') || null;

        const userId = await authModel.create({
          full_name: fullName,
          email: email.toLowerCase(),
          password_hash: passwordHash,
          role: cleanRole,
          department_id: departmentId,
          business_id: businessId,
          position_title: positionTitle,
          employee_id: employeeId,
          contact_number: contactNumber,
          employment_status: employmentStatus,
          date_hired: dateHired,
          birthdate: birthdate,
          address,
        });

        logAudit({
          user_id: req.user.id,
          action: 'user.bulk_created',
          entity_type: 'user',
          entity_id: userId,
          new_values: { email: email.toLowerCase(), role: cleanRole, full_name: fullName }
        });

        success++;
      } catch (err) {
        failed++;
        results.push({ row, error: err.message });
        console.error('Bulk user upload row error:', err);
      }
    }

    res.json({
      status: 'success',
      data: {
        total: rows.length,
        successful: success,
        failed,
        errors: results.filter(r => r.error).map(r => ({ row: r.row, error: r.error }))
      }
    });
  } catch (err) {
    console.error('Bulk user upload error:', err);
    res.status(500).json({ status: 'error', message: 'Bulk upload failed: ' + err.message, code: 'SERVER_ERROR' });
  }
});

module.exports = router;
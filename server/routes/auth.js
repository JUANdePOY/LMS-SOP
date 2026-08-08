const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { comparePassword, generateToken, hashPassword } = require('../app/auth');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const loginLimiter = require('../middleware/rateLimiter');

const router = express.Router();

const LOGIN_BODY_SAMPLE = (data) => {
  if (!data || typeof data !== 'object') return JSON.stringify(data);
  const out = { ...data };
  if (out.password) out.password = '***';
  return JSON.stringify(out);
};

const LOGIN_TIMEOUT_MS = 12000;

router.post('/login', loginLimiter, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .trim()
    .withMessage('Password is required')
], async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const loginTimer = setTimeout(() => {
    console.error(`[login:${requestId}] timeout after ${LOGIN_TIMEOUT_MS}ms`);
    if (!res.headersSent) {
      res.status(503).json({
        status: 'error',
        message: 'Login timed out. Please try again.',
        code: 'LOGIN_TIMEOUT',
        retry: true,
      });
    }
  }, LOGIN_TIMEOUT_MS);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      clearTimeout(loginTimer);
      console.warn(`[login:${requestId}] validation failed`, errors.array());
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    let results;
    try {
      [results] = await db.query(
        'SELECT u.*, d.name AS department_name FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.email = ?',
        [email]
      );
    } catch (dbErr) {
      clearTimeout(loginTimer);
      const dbErrCode = dbErr?.code || dbErr?.errno || 'DB_ERROR';
      console.error('Login DB query failed:', {
        email,
        dbHost: process.env.DB_HOST,
        dbName: process.env.DB_NAME,
        code: dbErrCode,
        message: dbErr?.message,
        stack: dbErr?.stack,
      });
      return res.status(503).json({
        status: 'error',
        message: 'Database temporarily unavailable. Please try again.',
        code: 'DB_UNAVAILABLE',
        retry: true,
      });
    }

    if (!results || results.length === 0) {
      clearTimeout(loginTimer);
      console.warn(`[login:${requestId}] user not found`, { email, dbHost: process.env.DB_HOST, dbName: process.env.DB_NAME });
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = results[0];

    if (!user.is_active) {
      clearTimeout(loginTimer);
      console.warn(`[login:${requestId}] deactivated account`, { email, userId: user.id });
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
      clearTimeout(loginTimer);
      console.warn(`[login:${requestId}] invalid password`, {
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

    clearTimeout(loginTimer);
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
          avatar_url: user.avatar_url,
        }
      }
    });
  } catch (error) {
    clearTimeout(loginTimer);
    const errCode = error?.code || error?.errno || null;
    const errMessage = error?.message || String(error);
    console.error(`[login:${requestId}] server error`, {
      method: req.method,
      path: req.path,
      contentType: req.get('content-type') || null,
      body: LOGIN_BODY_SAMPLE(req.body),
      error: {
        code: errCode,
        message: errMessage,
        stack: error?.stack,
      },
      dbHost: process.env.DB_HOST,
      dbName: process.env.DB_NAME,
    });
    if (errCode === 'ECONNRESET' || errCode === 'PROTOCOL_CONNECTION_LOST') {
      return res.status(503).json({
        status: 'error',
        message: 'Database temporarily unavailable. Please try again.',
        code: 'DB_UNAVAILABLE',
        retry: true,
      });
    }
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
    const allowed = ['full_name', 'email', 'position_title', 'contact_number', 'employment_status', 'date_hired', 'birthdate', 'address', 'avatar_url'];
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

const multer = require('multer');
const path = require('path');
const { safeExtFromOriginal, getUploadRoot } = require('../config/uploads');
const storage = require('../config/storage');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const AVATAR_MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
};

// Authenticate via Authorization header OR a ?token= query param. <img> tags
// cannot send headers, so the frontend appends the JWT as a query param.
async function authenticateAvatar(req, res, next) {
  const headerToken = req.headers['authorization']?.split(' ')[1];
  const token = headerToken || req.query.token;
  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Access token required', code: 'NO_TOKEN' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await db.query(
      'SELECT id, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );
    if (!users.length || !users[0].is_active) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized', code: 'USER_NOT_FOUND' });
    }
    req.user = { id: users[0].id };
    next();
  } catch {
    return res.status(401).json({ status: 'error', message: 'Invalid token', code: 'INVALID_TOKEN' });
  }
}

// Stream the current user's avatar directly from storage (local disk or S3).
// Served by Express itself so it works reliably behind hosts/proxies that do
// not serve the /uploads static directory.
router.get('/profile/avatar/file', authenticateAvatar, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT avatar_url FROM users WHERE id = ?', [req.user.id]);
    const url = rows[0]?.avatar_url;
    if (!url) {
      return res.status(404).json({ status: 'error', message: 'No avatar', code: 'NOT_FOUND' });
    }

    const fileResult = await storage.streamFile(url);
    let buffer = fileResult?.buffer || null;
    let contentType = fileResult?.contentType || null;
    let ext = path.extname(url.split('?')[0]).toLowerCase();

    if (!buffer) {
      const avatarDir = path.join(getUploadRoot(), 'avatars', String(req.user.id));
      try {
        const files = await fs.readdir(avatarDir);
        const fallbackFile = files.find((file) => {
          const fileExt = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(fileExt);
        });
        if (fallbackFile) {
          const fallbackPath = path.join(avatarDir, fallbackFile);
          const resolved = path.resolve(fallbackPath);
          const root = path.resolve(getUploadRoot());
          const rel = path.relative(root, resolved);
          if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
            buffer = await fs.readFile(resolved);
            ext = path.extname(fallbackFile).toLowerCase();
          }
        }
      } catch (fallbackError) {
        // ignore and continue to return 404 below
      }
    }

    if (!buffer) {
      return res.status(404).json({ status: 'error', message: 'Avatar missing', code: 'NOT_FOUND' });
    }

    contentType = contentType || AVATAR_MIME[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    return res.send(buffer);
  } catch (error) {
    console.error('Avatar file error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to load avatar', code: 'SERVER_ERROR' });
  }
});

const avatarStorage = multer.memoryStorage();
const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.post('/profile/avatar', authenticateToken, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No avatar file uploaded', code: 'NO_FILE' });
    }

    const userId = req.user.id;
    const ext = safeExtFromOriginal(req.file.originalname) || '.jpg';
    const filename = `avatar-${Date.now()}${ext}`;

    // Remove any previously stored avatar before writing the new one so we
    // don't leak orphaned files (important when storage is shared/persistent).
    const [prevRows] = await db.query('SELECT avatar_url FROM users WHERE id = ?', [userId]);
    if (prevRows[0]?.avatar_url) {
      await storage.deleteFile(prevRows[0].avatar_url).catch(() => {});
    }

    // Logical path kept stable so local and S3 drivers both store under avatars/<id>/.
    const dir = `avatars/${userId}`;
    const avatarUrl = await storage.saveFile({
      buffer: req.file.buffer,
      dir,
      filename,
      contentType: req.file.mimetype,
    });

    await db.query('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [avatarUrl, userId]);

    logAudit({
      user_id: userId,
      action: 'user.avatar_updated',
      entity_type: 'user',
      entity_id: userId,
      new_values: { avatar_url: avatarUrl },
    });

    res.json({ status: 'success', message: 'Avatar uploaded', data: { avatar_url: avatarUrl } });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to upload avatar', code: 'DB_ERROR' });
  }
});

router.delete('/profile/avatar', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query('SELECT avatar_url FROM users WHERE id = ?', [userId]);
    const user = rows[0];
    if (user?.avatar_url) {
      await storage.deleteFile(user.avatar_url).catch(() => {});
    }
    await db.query('UPDATE users SET avatar_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
    res.json({ status: 'success', message: 'Avatar removed' });
  } catch (error) {
    console.error('Avatar delete error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to remove avatar', code: 'DB_ERROR' });
  }
});

module.exports = router;
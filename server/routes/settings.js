const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/rbac');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

const VALID_ROLES = ['admin', 'admin_arsen', 'admin_group', 'admin_squadron', 'reservist'];

// ─── All settings routes require super admin ───────────────────────
router.use(authenticateToken, requireSuperAdmin);

// ────────────────────────────────────────────────────────────────────
// GET /api/settings/role-options
// Get available arsens, groups, squadrons for scope selection
// ────────────────────────────────────────────────────────────────────
router.get('/role-options', async (req, res) => {
  try {
    const [arsens] = await db.query('SELECT id, name, code FROM arsens WHERE is_active = TRUE ORDER BY name');
    const [groups] = await db.query('SELECT g.id, g.name, g.arsen_id, a.name AS arsen_name FROM `groups` g JOIN arsens a ON g.arsen_id = a.id WHERE g.is_active = TRUE ORDER BY a.name, g.name');
    const [squadrons] = await db.query('SELECT s.id, s.name, s.group_id, g.name AS group_name FROM squadron s JOIN `groups` g ON s.group_id = g.id WHERE s.is_active = TRUE ORDER BY g.name, s.name');

    res.json({ status: 'success', data: { arsens, groups, squadrons } });
  } catch (err) {
    console.error('Role options fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch role options', code: 'DB_ERROR' });
  }
});

// ────────────────────────────────────────────────────────────────────
// GET /api/settings/roles
// List all available roles
// ────────────────────────────────────────────────────────────────────
router.get('/roles', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, display_name, description, is_active FROM roles ORDER BY id'
    );
    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('Roles fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch roles', code: 'DB_ERROR' });
  }
});

// ────────────────────────────────────────────────────────────────────
// GET /api/settings/users
// List all users with their roles and scope info
// ────────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.email, u.role, u.is_active, u.scope_arsen_id, u.scope_group_id, u.scope_squadron_id,
             r.first_name, r.last_name, r.service_number, r.\`rank\`,
         a.name AS arsen_name,
         g.name AS group_name,
         s.name AS squadron_name,
         raa.id AS assignment_arsen_id, raa.name AS assignment_arsen_name,
         ra.group_id AS assignment_group_id, rag.name AS assignment_group_name,
         ra.squadron_id AS assignment_squadron_id, rasq.name AS assignment_squadron_name
      FROM users u
      LEFT JOIN reservists r ON u.id = r.user_id
      LEFT JOIN arsens a ON u.scope_arsen_id = a.id
      LEFT JOIN \`groups\` g ON u.scope_group_id = g.id
      LEFT JOIN squadron s ON u.scope_squadron_id = s.id
      LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
      LEFT JOIN \`groups\` rag ON ra.group_id = rag.id
      LEFT JOIN squadron rasq ON ra.squadron_id = rasq.id
      LEFT JOIN arsens raa ON rag.arsen_id = raa.id
      ORDER BY u.role, r.last_name, r.first_name
    `);
    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('Users fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch users', code: 'DB_ERROR' });
  }
});

// ────────────────────────────────────────────────────────────────────
// PUT /api/settings/users/:id/role
// Change a user's role and scope
// ────────────────────────────────────────────────────────────────────
router.put('/users/:id/role', [
  body('role').isIn(VALID_ROLES).withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
  }

  try {
    const userId = parseInt(req.params.id);
    const { role, scope_arsen_id, scope_group_id, scope_squadron_id } = req.body;

    const [users] = await db.query(
      'SELECT id, role, scope_arsen_id, scope_group_id, scope_squadron_id FROM users WHERE id = ?',
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'NOT_FOUND' });
    }

    const old = users[0];

    if (role === 'admin_arsen' && !scope_arsen_id) {
      return res.status(400).json({ status: 'error', message: 'admin_arsen requires scope_arsen_id', code: 'VALIDATION_ERROR' });
    }
    if (role === 'admin_group' && !scope_group_id) {
      return res.status(400).json({ status: 'error', message: 'admin_group requires scope_group_id', code: 'VALIDATION_ERROR' });
    }
    if (role === 'admin_squadron' && !scope_squadron_id) {
      return res.status(400).json({ status: 'error', message: 'admin_squadron requires scope_squadron_id', code: 'VALIDATION_ERROR' });
    }

    const newScopeArsen = (role === 'admin_arsen') ? scope_arsen_id : null;
    const newScopeGroup = (role === 'admin_group') ? scope_group_id : null;
    const newScopeSquadron = (role === 'admin_squadron') ? scope_squadron_id : null;

    await db.query(
      'UPDATE users SET role = ?, scope_arsen_id = ?, scope_group_id = ?, scope_squadron_id = ? WHERE id = ?',
      [role, newScopeArsen, newScopeGroup, newScopeSquadron, userId]
    );

    await db.query(
      `INSERT INTO user_role_history
       (user_id, old_role, new_role, old_scope_arsen_id, new_scope_arsen_id,
        old_scope_group_id, new_scope_group_id, old_scope_squadron_id, new_scope_squadron_id, changed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, old.role, role, old.scope_arsen_id, newScopeArsen,
       old.scope_group_id, newScopeGroup, old.scope_squadron_id, newScopeSquadron, req.user.id]
    );

    logAudit({
      user_id: req.user.id,
      action: 'user.role_changed',
      entity_type: 'user',
      entity_id: userId,
      old_values: { role: old.role, scope_arsen_id: old.scope_arsen_id, scope_group_id: old.scope_group_id, scope_squadron_id: old.scope_squadron_id },
      new_values: { role, scope_arsen_id: newScopeArsen, scope_group_id: newScopeGroup, scope_squadron_id: newScopeSquadron },
    });

    res.json({ status: 'success', message: 'User role updated', data: { userId, role, scope_arsen_id: newScopeArsen, scope_group_id: newScopeGroup, scope_squadron_id: newScopeSquadron } });
  } catch (err) {
    console.error('Role change error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update user role', code: 'DB_ERROR' });
  }
});

// ────────────────────────────────────────────────────────────────────
// GET /api/settings/users/:id/role-history
// Get role change history for a user
// ────────────────────────────────────────────────────────────────────
router.get('/users/:id/role-history', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const [rows] = await db.query(
      `SELECT h.*, r.first_name, r.last_name
       FROM user_role_history h
       LEFT JOIN users u ON h.changed_by = u.id
       LEFT JOIN reservists r ON u.id = r.user_id
       WHERE h.user_id = ?
       ORDER BY h.changed_at DESC`,
      [userId]
    );
    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('Role history fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch role history', code: 'DB_ERROR' });
  }
});

// ────────────────────────────────────────────────────────────────────
// GET /api/settings
// List all system settings
// ────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT `key`, `value`, description, updated_by, updated_at FROM system_settings ORDER BY `key`'
    );
    const settings = rows.map(r => {
      let parsedValue = r.value;
      if (typeof r.value === 'string') {
        try { parsedValue = JSON.parse(r.value); } catch { parsedValue = r.value; }
      }
      return {
        key: r.key,
        value: parsedValue,
        description: r.description,
        updated_by: r.updated_by,
        updated_at: r.updated_at,
      };
    });
    res.json({ status: 'success', data: settings });
  } catch (err) {
    console.error('Settings fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch settings', code: 'DB_ERROR' });
  }
});

// ────────────────────────────────────────────────────────────────────
// PUT /api/settings/:key
// Update a single setting
// ────────────────────────────────────────────────────────────────────
router.put('/:key', [
  body('value').exists().withMessage('Value is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
  }

  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const [existing] = await db.query('SELECT `key` FROM system_settings WHERE `key` = ?', [key]);
    if (existing.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Setting not found', code: 'NOT_FOUND' });
    }

    const jsonValue = JSON.stringify(value);
    const desc = description !== undefined ? description : null;

    await db.query(
      'UPDATE system_settings SET `value` = ?, description = COALESCE(?, description), updated_by = ? WHERE `key` = ?',
      [jsonValue, desc, req.user.id, key]
    );

    logAudit({
      user_id: req.user.id,
      action: 'settings.updated',
      entity_type: 'system_settings',
      entity_id: null,
      new_values: { key, value },
    });

    res.json({ status: 'success', message: 'Setting updated', data: { key, value } });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update setting', code: 'DB_ERROR' });
  }
});

// ────────────────────────────────────────────────────────────────────
// POST /api/settings
// Create a new setting
// ────────────────────────────────────────────────────────────────────
router.post('/', [
  body('key').isString().trim().notEmpty().withMessage('Key is required'),
  body('value').exists().withMessage('Value is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
  }

  try {
    const { key, value, description } = req.body;

    const [existing] = await db.query('SELECT `key` FROM system_settings WHERE `key` = ?', [key]);
    if (existing.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Setting key already exists', code: 'KEY_EXISTS' });
    }

    await db.query(
      'INSERT INTO system_settings (`key`, `value`, description, updated_by) VALUES (?, ?, ?, ?)',
      [key, JSON.stringify(value), description || null, req.user.id]
    );

    logAudit({
      user_id: req.user.id,
      action: 'settings.created',
      entity_type: 'system_settings',
      entity_id: null,
      new_values: { key, value },
    });

    res.status(201).json({ status: 'success', message: 'Setting created', data: { key, value } });
  } catch (err) {
    console.error('Settings create error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create setting', code: 'DB_ERROR' });
  }
});

module.exports = router;

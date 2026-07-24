const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.use(authenticateToken);

// GET /api/roles
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, display_name, description, is_active, created_at FROM roles ORDER BY id');
    const enriched = await Promise.all(
      rows.map(async (role) => {
        const [[permCount]] = await db.query('SELECT COUNT(*) as count FROM role_permissions WHERE role_name = ?', [role.name]);
        return { ...role, permission_count: permCount?.count || 0 };
      })
    );
    res.json({ status: 'success', data: enriched });
  } catch (err) {
    console.error('Roles fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch roles', code: 'DB_ERROR' });
  }
});

// GET /api/roles/permissions
router.get('/permissions', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, display_name, description, category, is_active FROM permissions ORDER BY category, name');
    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('Permissions fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch permissions', code: 'DB_ERROR' });
  }
});

// PUT /api/roles/permissions/:roleName
router.put('/permissions/:roleName', [
  body('permission_names').optional().isArray().withMessage('permission_names must be an array'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const roleName = req.params.roleName;
    const permission_names = req.body.permission_names || [];

    const [existing] = await db.query('SELECT id FROM roles WHERE name = ?', [roleName]);
    if (existing.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Role not found', code: 'NOT_FOUND' });
    }

    await db.query('DELETE FROM role_permissions WHERE role_name = ?', [roleName]);

    if (Array.isArray(permission_names) && permission_names.length > 0) {
      const values = permission_names.map(p => [roleName, p]);
      await db.query('INSERT INTO role_permissions (role_name, permission_name) VALUES ?', [values]);
    }

    logAudit({
      user_id: req.user.id,
      action: 'role.permissions_updated',
      entity_type: 'role',
      entity_id: null,
      new_values: { role_name: roleName, permission_count: permission_names.length }
    });

    res.json({ status: 'success', message: 'Role permissions updated', data: { role_name: roleName, permission_count: permission_names.length } });
  } catch (err) {
    console.error('Role permissions update error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update permissions', code: 'DB_ERROR' });
  }
});

// GET /api/roles/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(404).json({ status: 'error', message: 'Role not found', code: 'NOT_FOUND' });
    }
    const [rows] = await db.query('SELECT id, name, display_name, description, is_active FROM roles WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Role not found', code: 'NOT_FOUND' });
    }
    const role = rows[0];
    const [perms] = await db.query('SELECT p.id, p.name, p.display_name, p.category FROM permissions p JOIN role_permissions rp ON p.name = rp.permission_name WHERE rp.role_name = ? ORDER BY p.category, p.name', [role.name]);
    role.permissions = perms;
    res.json({ status: 'success', data: role });
  } catch (err) {
    console.error('Role fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch role', code: 'DB_ERROR' });
  }
});

// POST /api/roles
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Role name is required (2-100 chars)'),
  body('display_name').trim().isLength({ min: 2, max: 255 }).withMessage('Display name is required (2-255 chars)'),
  body('description').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const { name, display_name, description } = req.body;

    const [existing] = await db.query('SELECT id FROM roles WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Role name already exists', code: 'NAME_EXISTS' });
    }

    await db.query('INSERT INTO roles (name, display_name, description) VALUES (?, ?, ?)', [name, display_name, description || null]);

    logAudit({
      user_id: req.user.id,
      action: 'role.created',
      entity_type: 'role',
      entity_id: null,
      new_values: { name, display_name }
    });

    res.status(201).json({ status: 'success', message: 'Role created successfully' });
  } catch (err) {
    console.error('Role create error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create role', code: 'DB_ERROR' });
  }
});

// PUT /api/roles/:id
router.put('/:id', [
  body('display_name').optional().trim().isLength({ min: 2, max: 255 }),
  body('description').optional().trim(),
  body('is_active').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(404).json({ status: 'error', message: 'Role not found', code: 'NOT_FOUND' });
    }
    const [existing] = await db.query('SELECT id FROM roles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Role not found', code: 'NOT_FOUND' });
    }

    const updates = {};
    const allowed = ['display_name', 'description', 'is_active'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No changes provided', code: 'VALIDATION_ERROR' });
    }

    await db.query('UPDATE roles SET ? WHERE id = ?', [updates, id]);

    logAudit({
      user_id: req.user.id,
      action: 'role.updated',
      entity_type: 'role',
      entity_id: id,
      new_values: updates
    });

    res.json({ status: 'success', message: 'Role updated successfully' });
  } catch (err) {
    console.error('Role update error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update role', code: 'DB_ERROR' });
  }
});

// DELETE /api/roles/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(404).json({ status: 'error', message: 'Role not found', code: 'NOT_FOUND' });
    }

    const [rows] = await db.query('SELECT id, name FROM roles WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Role not found', code: 'NOT_FOUND' });
    }

    const role = rows[0];

    await db.query('DELETE FROM role_permissions WHERE role_name = ?', [role.name]);
    await db.query('DELETE FROM roles WHERE id = ?', [id]);

    logAudit({
      user_id: req.user.id,
      action: 'role.deleted',
      entity_type: 'role',
      entity_id: id,
      old_values: { name: role.name }
    });

    res.json({ status: 'success', message: 'Role deleted successfully' });
  } catch (err) {
    console.error('Role delete error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete role', code: 'DB_ERROR' });
  }
});

module.exports = router;

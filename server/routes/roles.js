const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');
const { resolveUserPermissions, resolveUserPermissionDetails, parseActions, requirePermission } = require('../middleware/scope');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.use(authenticateToken);

router.get('/my-permissions', authenticateToken, async (req, res) => {
  try {
    const permissions = await resolveUserPermissions(req.user.id, req.user.role);
    const permissionDetails = await resolveUserPermissionDetails(req.user.id, req.user.role);
    res.json({ status: 'success', data: { permissions, permission_details: permissionDetails, role: req.user.role } });
  } catch (err) {
    console.error('My permissions error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch permissions', code: 'DB_ERROR' });
  }
});

router.get('/users/:userId/permissions', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const [userRows] = await db.query('SELECT id, role FROM users WHERE id = ?', [targetUserId]);
    if (userRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'NOT_FOUND' });
    }

    const [overrides] = await db.query(
      'SELECT permission_name, granted, actions FROM user_permission_overrides WHERE user_id = ?',
      [targetUserId]
    );
    res.json({ status: 'success', data: { role: userRows[0].role, overrides } });
  } catch (err) {
    console.error('User permissions fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch user permissions', code: 'DB_ERROR' });
  }
});

router.put('/users/:userId/permissions', authenticateToken, requireSuperAdmin, [
  body('overrides').isArray().withMessage('overrides must be an array'),
  body('overrides.*.permission_name').notEmpty().withMessage('permission_name is required'),
  body('overrides.*.granted').isBoolean().withMessage('granted must be boolean'),
  body('overrides.*.actions').optional({ nullable: true }).isArray().withMessage('actions must be an array'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const targetUserId = parseInt(req.params.userId);
    const [userRows] = await db.query('SELECT id FROM users WHERE id = ?', [targetUserId]);
    if (userRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'NOT_FOUND' });
    }

    const [allPerms] = await db.query('SELECT name, actions FROM permissions WHERE is_active = TRUE');
    const permActionMap = new Map(allPerms.map(p => [p.name, parseActions(p.actions, p.name)]));

    const overrides = req.body.overrides || [];
    for (const o of overrides) {
      if (!permActionMap.has(o.permission_name)) {
        return res.status(400).json({
          status: 'error',
          message: `Unknown permission: ${o.permission_name}`,
          code: 'UNKNOWN_PERMISSION',
        });
      }

      if (Array.isArray(o.actions)) {
        const defined = permActionMap.get(o.permission_name);
        const invalid = o.actions.filter((a) => typeof a !== 'string' || !defined.includes(a));
        if (invalid.length > 0) {
          return res.status(400).json({
            status: 'error',
            message: `Invalid actions for ${o.permission_name}: ${invalid.join(', ')}`,
            code: 'INVALID_ACTIONS',
          });
        }
      }
    }

    await db.query('DELETE FROM user_permission_overrides WHERE user_id = ?', [targetUserId]);

    if (overrides.length > 0) {
      const values = overrides.map(o => {
        const actionsJson = Array.isArray(o.actions) ? JSON.stringify(o.actions) : null;
        return [targetUserId, o.permission_name, o.granted ? 1 : 0, actionsJson, req.user.id];
      });
      await db.query(
        'INSERT INTO user_permission_overrides (user_id, permission_name, granted, actions, granted_by) VALUES ?',
        [values]
      );
    }

    logAudit({
      user_id: req.user.id,
      action: 'user.permissions_updated',
      entity_type: 'user',
      entity_id: targetUserId,
      new_values: { override_count: overrides.length }
    });

    res.json({ status: 'success', message: 'User permissions updated' });
  } catch (err) {
    console.error('User permissions update error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update user permissions', code: 'DB_ERROR' });
  }
});

router.put('/permissions/:roleName', authenticateToken, requireSuperAdmin, [
  body('permission_names').optional().isArray().withMessage('permission_names must be an array'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const roleName = req.params.roleName;
    const { permission_names } = req.body;

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
      new_values: { role_name: roleName, permission_count: permission_names?.length || 0 }
    });

    res.json({ status: 'success', message: 'Role permissions updated', data: { role_name: roleName, permission_count: permission_names?.length || 0 } });
  } catch (err) {
    console.error('Role permissions update error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update permissions', code: 'DB_ERROR' });
  }
});

router.get('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, display_name, description, is_active, created_at FROM roles ORDER BY id');
    const enriched = await Promise.all(
      rows.map(async (role) => {
        const [[permCount]] = await db.query('SELECT COUNT(*) as count FROM role_permissions WHERE role_name = ?', [role.name]);
        const [[userCount]] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = ?', [role.name]);
        return { ...role, permission_count: permCount?.count || 0, user_count: userCount?.count || 0 };
      })
    );
    res.json({ status: 'success', data: enriched });
  } catch (err) {
    console.error('Roles fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch roles', code: 'DB_ERROR' });
  }
});

router.get('/permissions', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, display_name, description, category, is_active, actions FROM permissions ORDER BY category, name');
    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('Permissions fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch permissions', code: 'DB_ERROR' });
  }
});

const ALLOWED_ENTITY_TYPES = new Set(['course', 'sop', 'client']);

const ENTITY_TABLES = {
  course: { table: 'courses', id: 'id', label: 'title' },
  sop: { table: 'sops', id: 'id', label: 'title' },
  client: { table: 'clients', id: 'id', label: 'client_name' },
  project: { table: 'projects', id: 'id', label: 'name' },
  task: { table: 'tasks', id: 'id', label: 'title' },
  business: { table: 'businesses', id: 'id', label: 'business_name' },
};

const ENTITY_ACTIVE_FILTER = {
  course: 'is_deleted = 0',
  sop: 'is_deleted = 0',
  client: '1=1',
  project: '1=1',
  task: '1=1',
  business: "status = 'active'",
};

router.get('/entities', authenticateToken, requirePermission('manage_users'), async (req, res) => {
  try {
    let type = req.query.type;
    if (typeof type === 'string') {
      type = type.split(':')[0];
    }
    if (!type || !ENTITY_TABLES[type]) {
      return res.status(400).json({ status: 'error', message: 'Invalid entity type', code: 'INVALID_ENTITY_TYPE' });
    }
    const cfg = ENTITY_TABLES[type];
    const activeFilter = ENTITY_ACTIVE_FILTER[type] || '1=1';
    const [rows] = await db.query(`SELECT ${cfg.id} as id, ${cfg.label} as label FROM ${cfg.table} WHERE ${activeFilter} ORDER BY label LIMIT 200`);
    const data = rows.map((row) => ({ ...row, entity_type: type }));
    res.json({ status: 'success', data });
  } catch (err) {
    console.error('Entities fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch entities', code: 'DB_ERROR' });
  }
});

router.get('/entities/search', authenticateToken, requirePermission('manage_users'), async (req, res) => {
  try {
    let type = req.query.type;
    const q = (req.query.q || '').trim();
    if (typeof type === 'string') {
      type = type.split(':')[0];
    }
    if (!type || !ENTITY_TABLES[type]) {
      return res.status(400).json({ status: 'error', message: 'Invalid entity type', code: 'INVALID_ENTITY_TYPE' });
    }
    const cfg = ENTITY_TABLES[type];
    const activeFilter = ENTITY_ACTIVE_FILTER[type] || '1=1';
    const like = `%${q}%`;
    const [rows] = await db.query(
      `SELECT ${cfg.id} as id, ${cfg.label} as label, ? as entity_type FROM ${cfg.table} WHERE ${activeFilter} AND (${cfg.label} LIKE ? OR CAST(${cfg.id} AS CHAR) LIKE ?) ORDER BY label LIMIT 50`,
      [type, like, like]
    );
    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('Entity search error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to search entities', code: 'DB_ERROR' });
  }
});

router.get('/users/:userId/entity-overrides', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const [userRows] = await db.query('SELECT id, role FROM users WHERE id = ?', [targetUserId]);
    if (userRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'NOT_FOUND' });
    }
    const [overrides] = await db.query(
      'SELECT id, permission_name, entity_type, entity_id, granted, actions FROM entity_permission_overrides WHERE user_id = ? ORDER BY entity_type, entity_id',
      [targetUserId]
    );
    res.json({ status: 'success', data: { role: userRows[0].role, overrides } });
  } catch (err) {
    console.error('User entity overrides fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch user entity overrides', code: 'DB_ERROR' });
  }
});

router.get('/users/:userId/entity-overrides/:entityType', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const entityType = req.params.entityType;
    const [userRows] = await db.query('SELECT id, role FROM users WHERE id = ?', [targetUserId]);
    if (userRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'NOT_FOUND' });
    }
    const cfg = ENTITY_TABLES[entityType];
    if (!cfg) {
      return res.status(400).json({ status: 'error', message: 'Invalid entity type', code: 'INVALID_ENTITY_TYPE' });
    }
    const activeFilter = ENTITY_ACTIVE_FILTER[entityType] || '1=1';
    const [entities] = await db.query(`SELECT ${cfg.id} as id, ${cfg.label} as label FROM ${cfg.table} WHERE ${activeFilter} ORDER BY label`);
    const [overrides] = await db.query(
      'SELECT id, permission_name, entity_id, granted, actions FROM entity_permission_overrides WHERE user_id = ? AND entity_type = ?',
      [targetUserId, entityType]
    );
    const overrideMap = new Map();
    for (const o of overrides) {
      if (!overrideMap.has(o.entity_id)) overrideMap.set(o.entity_id, []);
      overrideMap.get(o.entity_id).push(o);
    }
    const result = entities.map((e) => ({
      ...e,
      overrides: overrideMap.get(e.id) || [],
    }));
    res.json({ status: 'success', data: result });
  } catch (err) {
    console.error('User entity overrides by type fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch entity overrides', code: 'DB_ERROR' });
  }
});

router.get('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
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
    const [perms] = await db.query('SELECT p.id, p.name, p.display_name, p.category, p.actions, p.description FROM permissions p JOIN role_permissions rp ON p.name = rp.permission_name WHERE rp.role_name = ? ORDER BY p.category, p.name', [role.name]);
    role.permissions = perms;
    res.json({ status: 'success', data: role });
  } catch (err) {
    console.error('Role fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch role', code: 'DB_ERROR' });
  }
});

router.post('/', authenticateToken, requireSuperAdmin, [
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

router.put('/:id', authenticateToken, requireSuperAdmin, [
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

router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
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

router.put('/users/:userId/entity-overrides', authenticateToken, requireSuperAdmin, [
  body('overrides').isArray().withMessage('overrides must be an array'),
  body('overrides.*.permission_name').notEmpty().withMessage('permission_name is required'),
  body('overrides.*.entity_type').notEmpty().withMessage('entity_type is required'),
  body('overrides.*.entity_id').optional({ nullable: true }).isInt().withMessage('entity_id must be an integer'),
  body('overrides.*.granted').isBoolean().withMessage('granted must be boolean'),
  body('overrides.*.actions').optional({ nullable: true }).isArray().withMessage('actions must be an array'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const targetUserId = parseInt(req.params.userId);
    const [userRows] = await db.query('SELECT id FROM users WHERE id = ?', [targetUserId]);
    if (userRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'NOT_FOUND' });
    }

    const [allPerms] = await db.query('SELECT name, actions FROM permissions WHERE is_active = TRUE');
    const permActionMap = new Map(allPerms.map(p => [p.name, parseActions(p.actions, p.name)]));

    const validEntityTypes = new Set(Object.keys(ENTITY_TABLES));
    const overrides = req.body.overrides || [];
    for (const o of overrides) {
      if (!permActionMap.has(o.permission_name)) {
        return res.status(400).json({
          status: 'error',
          message: `Unknown permission: ${o.permission_name}`,
          code: 'UNKNOWN_PERMISSION',
        });
      }
      if (!validEntityTypes.has(o.entity_type)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid entity type: ${o.entity_type}`,
          code: 'INVALID_ENTITY_TYPE',
        });
      }
      if (Array.isArray(o.actions)) {
        const defined = permActionMap.get(o.permission_name);
        const invalid = o.actions.filter((a) => typeof a !== 'string' || !defined.includes(a));
        if (invalid.length > 0) {
          return res.status(400).json({
            status: 'error',
            message: `Invalid actions for ${o.permission_name}: ${invalid.join(', ')}`,
            code: 'INVALID_ACTIONS',
          });
        }
      }
    }

    await db.query('DELETE FROM entity_permission_overrides WHERE user_id = ?', [targetUserId]);

    if (overrides.length > 0) {
      const values = overrides.map(o => {
        const actionsJson = Array.isArray(o.actions) ? JSON.stringify(o.actions) : null;
        return [targetUserId, o.permission_name, o.entity_type, o.entity_id, o.granted ? 1 : 0, actionsJson, req.user.id];
      });
      await db.query(
        'INSERT INTO entity_permission_overrides (user_id, permission_name, entity_type, entity_id, granted, actions, granted_by) VALUES ?',
        [values]
      );
    }

    logAudit({
      user_id: req.user.id,
      action: 'user.entity_permissions_updated',
      entity_type: 'user',
      entity_id: targetUserId,
      new_values: { override_count: overrides.length }
    });

    res.json({ status: 'success', message: 'User entity permissions updated' });
  } catch (err) {
    console.error('User entity permissions update error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update user entity permissions', code: 'DB_ERROR' });
  }
});

router.get('/:roleName/entity-permissions', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const roleName = req.params.roleName;
    const [roleRows] = await db.query('SELECT id, name FROM roles WHERE name = ?', [roleName]);
    if (roleRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Role not found', code: 'NOT_FOUND' });
    }

    const [overrides] = await db.query(
      'SELECT id, permission_name, entity_type, entity_id, granted, actions FROM role_entity_permissions WHERE role_name = ? ORDER BY entity_type, entity_id',
      [roleName]
    );
    res.json({ status: 'success', data: { role: roleRows[0].name, overrides } });
  } catch (err) {
    console.error('Role entity permissions fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch role entity permissions', code: 'DB_ERROR' });
  }
});

router.put('/:roleName/entity-permissions', authenticateToken, requireSuperAdmin, [
  body('overrides').isArray().withMessage('overrides must be an array'),
  body('overrides.*.permission_name').notEmpty().withMessage('permission_name is required'),
  body('overrides.*.entity_type').notEmpty().withMessage('entity_type is required'),
  body('overrides.*.entity_id').optional({ nullable: true }).isInt().withMessage('entity_id must be an integer'),
  body('overrides.*.granted').isBoolean().withMessage('granted must be boolean'),
  body('overrides.*.actions').optional({ nullable: true }).isArray().withMessage('actions must be an array'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const roleName = req.params.roleName;
    const [roleRows] = await db.query('SELECT id FROM roles WHERE name = ?', [roleName]);
    if (roleRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Role not found', code: 'NOT_FOUND' });
    }

    const [allPerms] = await db.query('SELECT name, actions FROM permissions WHERE is_active = TRUE');
    const permActionMap = new Map(allPerms.map(p => [p.name, parseActions(p.actions, p.name)]));

    const validEntityTypes = new Set(Object.keys(ENTITY_TABLES));
    const overrides = req.body.overrides || [];
    for (const o of overrides) {
      if (!permActionMap.has(o.permission_name)) {
        return res.status(400).json({
          status: 'error',
          message: `Unknown permission: ${o.permission_name}`,
          code: 'UNKNOWN_PERMISSION',
        });
      }
      if (!validEntityTypes.has(o.entity_type)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid entity type: ${o.entity_type}`,
          code: 'INVALID_ENTITY_TYPE',
        });
      }
      if (Array.isArray(o.actions)) {
        const defined = permActionMap.get(o.permission_name);
        const invalid = o.actions.filter((a) => typeof a !== 'string' || !defined.includes(a));
        if (invalid.length > 0) {
          return res.status(400).json({
            status: 'error',
            message: `Invalid actions for ${o.permission_name}: ${invalid.join(', ')}`,
            code: 'INVALID_ACTIONS',
          });
        }
      }
    }

    await db.query('DELETE FROM role_entity_permissions WHERE role_name = ?', [roleName]);

    if (overrides.length > 0) {
      const values = overrides.map(o => {
        const actionsJson = Array.isArray(o.actions) ? JSON.stringify(o.actions) : null;
        return [roleName, o.permission_name, o.entity_type, o.entity_id, o.granted ? 1 : 0, actionsJson, req.user.id];
      });
      await db.query(
        'INSERT INTO role_entity_permissions (role_name, permission_name, entity_type, entity_id, granted, actions, granted_by) VALUES ?',
        [values]
      );
    }

    logAudit({
      user_id: req.user.id,
      action: 'role.entity_permissions_updated',
      entity_type: 'role',
      entity_id: roleRows[0].id,
      new_values: { override_count: overrides.length }
    });

    res.json({ status: 'success', message: 'Role entity permissions updated' });
  } catch (err) {
    console.error('Role entity permissions update error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update role entity permissions', code: 'DB_ERROR' });
  }
});

module.exports = router;

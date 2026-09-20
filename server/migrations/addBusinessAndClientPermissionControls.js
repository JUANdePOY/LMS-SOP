const db = require('../config/database');

async function addBusinessAndClientPermissionControls() {
  const [permRows] = await db.query('SELECT name FROM permissions WHERE name IN (?, ?) LIMIT 2', ['manage_businesses', 'manage_clients']);
  const existingPerms = new Set(permRows.map((r) => r.name));

  if (!existingPerms.has('manage_businesses')) {
    await db.query(
      `INSERT INTO permissions (name, display_name, description, category, actions, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      ['manage_businesses', 'Manage Businesses', 'Create, edit, view, and delete businesses', 'businesses', JSON.stringify(['view', 'create', 'edit', 'delete'])]
    );
    console.log('Created permission: manage_businesses');
  }

  if (!existingPerms.has('manage_clients')) {
    await db.query(
      `INSERT INTO permissions (name, display_name, description, category, actions, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      ['manage_clients', 'Manage Clients', 'Create, edit, view, and delete clients', 'clients', JSON.stringify(['view', 'create', 'edit', 'delete'])]
    );
    console.log('Created permission: manage_clients');
  }

  await db.query(
    `UPDATE permissions SET actions = ? WHERE name = 'manage_clients' AND (actions IS NULL OR actions = '')`,
    [JSON.stringify(['view', 'create', 'edit', 'delete'])]
  );

  const rolePermInserts = [];
  const roleNames = ['super_admin', 'admin', 'department_head'];
  const permsToAssign = ['manage_businesses', 'manage_clients'];

  for (const roleName of roleNames) {
    for (const permName of permsToAssign) {
      const [[exists]] = await db.query(
        'SELECT 1 FROM role_permissions WHERE role_name = ? AND permission_name = ? LIMIT 1',
        [roleName, permName]
      );
      if (!exists) {
        rolePermInserts.push([roleName, permName]);
      }
    }
  }

  if (rolePermInserts.length > 0) {
    await db.query(
      'INSERT INTO role_permissions (role_name, permission_name) VALUES ?',
      [rolePermInserts]
    );
    console.log(`Assigned ${rolePermInserts.length} role-permission mappings`);
  }

  console.log('Business and client permission controls migration completed');
}

module.exports = { addBusinessAndClientPermissionControls };

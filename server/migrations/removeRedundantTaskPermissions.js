const db = require('../config/database');

async function removeRedundantTaskPermissions() {
  const redundantPermissions = [
    'tasks.create',
    'tasks.view',
    'tasks.create_task',
    'tasks.edit',
    'tasks.delete',
    'tasks.assign.department',
    'tasks.assign.any',
    'tasks.view.all',
  ];

  for (const permName of redundantPermissions) {
    await db.query('DELETE FROM permissions WHERE name = ?', [permName]);
  }

  console.log('Redundant task permissions removed');
}

module.exports = { removeRedundantTaskPermissions };

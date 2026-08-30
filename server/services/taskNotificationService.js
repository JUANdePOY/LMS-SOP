const db = require('../config/database');
const notificationService = require('./notificationService');

const ADMIN_ROLES = ['super_admin', 'admin', 'department_head'];

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

// Expand a task's assignments (User / Department / Position) into the concrete
// set of users who should receive notifications about that task.
async function resolveAssignedUsers(taskId) {
  const [assignmentRows] = await db.query(
    `SELECT assignment_type, reference_id FROM task_assignments WHERE task_id = ?`,
    [taskId]
  );
  if (!assignmentRows.length) return [];

  const userIds = new Set();
  const deptIds = new Set();
  const positions = new Set();

  for (const a of assignmentRows) {
    if (a.assignment_type === 'User') {
      userIds.add(Number(a.reference_id));
    } else if (a.assignment_type === 'Department') {
      deptIds.add(Number(a.reference_id));
    } else if (a.assignment_type === 'Position') {
      positions.add(a.reference_id);
    }
  }

  const conditions = [];
  const params = [];
  if (userIds.size) {
    conditions.push('id IN (?)');
    params.push([...userIds]);
  }
  if (deptIds.size) {
    conditions.push('department_id IN (?)');
    params.push([...deptIds]);
  }
  if (positions.size) {
    conditions.push('position_title IN (?)');
    params.push([...positions]);
  }
  if (!conditions.length) return [];

  const [users] = await db.query(
    `SELECT id, role FROM users WHERE is_active = 1 AND (${conditions.join(' OR ')})`,
    params
  );
  return users.map((u) => ({ id: u.id, role: u.role }));
}

async function getAdminUsers() {
  const [admins] = await db.query(
    `SELECT id, role FROM users WHERE is_active = 1 AND role IN (?, ?, ?)`,
    ADMIN_ROLES
  );
  return admins.map((u) => ({ id: u.id, role: u.role }));
}

// Notify every employee assigned to a task. Push is sent only to non-admin
// assignees — admins are pushed exclusively when a task is done/overdue (see
// notifyAdminsTaskStatus), per the notification rules.
async function notifyTaskAssigned(task, { push = true } = {}) {
  if (!task || !task.id) return [];
  const users = await resolveAssignedUsers(task.id);
  const promises = users.map((user) => {
    const shouldPush = push && !isAdminRole(user.role);
    return notificationService.createNotification({
      userId: user.id,
      title: 'You have been assigned a task',
      body: task.title,
      type: 'info',
      link: `/tasks/${task.id}`,
      entityType: 'task',
      entityId: task.id,
      category: 'task',
      disablePush: !shouldPush,
      disableSound: !shouldPush,
    });
  });
  return Promise.all(promises);
}

// Notify only the users covered by a single newly-created assignment. Used by
// the assign endpoint so existing assignees are not re-notified.
async function notifyAssignmentAdded(taskId, assignment) {
  if (!taskId || !assignment) return [];
  const [taskRows] = await db.query('SELECT id, title FROM tasks WHERE id = ?', [taskId]);
  const task = taskRows[0];
  if (!task) return [];

  const { assignment_type, reference_id } = assignment;
  const conditions = [];
  const params = [];
  if (assignment_type === 'User') {
    conditions.push('id = ?');
    params.push(Number(reference_id));
  } else if (assignment_type === 'Department') {
    conditions.push('department_id = ?');
    params.push(Number(reference_id));
  } else if (assignment_type === 'Position') {
    conditions.push('position_title = ?');
    params.push(reference_id);
  } else {
    return [];
  }

  const [users] = await db.query(
    `SELECT id, role FROM users WHERE is_active = 1 AND ${conditions.join(' AND ')}`,
    params
  );

  const promises = users.map((user) => {
    const shouldPush = !isAdminRole(user.role);
    return notificationService.createNotification({
      userId: user.id,
      title: 'You have been assigned a task',
      body: task.title,
      type: 'info',
      link: `/tasks/${task.id}`,
      entityType: 'task',
      entityId: task.id,
      category: 'task',
      disablePush: !shouldPush,
      disableSound: !shouldPush,
    });
  });
  return Promise.all(promises);
}

// Notify only assignees that were added by an assignment-aware update (e.g.
// editing a task's assignment list through updateTask). Pure field edits that
// don't change assignments produce no notifications.
async function notifyNewAssignments(taskId, previousKeys = []) {
  if (!taskId) return [];
  const [rows] = await db.query(
    `SELECT id, assignment_type, reference_id FROM task_assignments WHERE task_id = ?`,
    [taskId]
  );
  const prev = new Set(previousKeys);
  const added = rows.filter((a) => !prev.has(`${a.assignment_type}:${a.reference_id}`));
  const promises = added.map((a) => notifyAssignmentAdded(taskId, a));
  return Promise.all(promises);
}

// Notify only the users explicitly mentioned in a comment. Mentions are
// in-app only (never push), per the notification rules.
async function notifyMentioned(task, mentionedUserIds = []) {
  const ids = Array.isArray(mentionedUserIds)
    ? mentionedUserIds.map((v) => Number(v)).filter(Boolean)
    : [];
  if (!ids.length) return [];

  const [rows] = await db.query(
    `SELECT id FROM users WHERE id IN (?) AND is_active = 1`,
    [ids]
  );
  const validIds = rows.map((r) => r.id);

  const promises = validIds.map((userId) =>
    notificationService.createNotification({
      userId,
      title: 'You were mentioned',
      body: task ? task.title : 'A task comment mentioned you',
      type: 'info',
      link: task ? `/tasks/${task.id}` : undefined,
      entityType: 'task',
      entityId: task ? task.id : undefined,
      category: 'mention',
      disablePush: true,
      disableSound: false,
    })
  );
  return Promise.all(promises);
}

// Push-notify admins when a task becomes done or overdue.
async function notifyAdminsTaskStatus(task, statusLabel) {
  if (!task || !task.id) return [];
  const admins = await getAdminUsers();
  const type = statusLabel === 'Overdue' ? 'warning' : 'success';
  const promises = admins.map((admin) =>
    notificationService.createNotification({
      userId: admin.id,
      title: `Task ${statusLabel}`,
      body: task.title,
      type,
      link: `/tasks/${task.id}`,
      entityType: 'task',
      entityId: task.id,
      category: 'task_admin',
      disablePush: false,
      disableSound: false,
    })
  );
  return Promise.all(promises);
}

module.exports = {
  ADMIN_ROLES,
  resolveAssignedUsers,
  getAdminUsers,
  notifyTaskAssigned,
  notifyAssignmentAdded,
  notifyNewAssignments,
  notifyMentioned,
  notifyAdminsTaskStatus,
  isAdminRole,
};

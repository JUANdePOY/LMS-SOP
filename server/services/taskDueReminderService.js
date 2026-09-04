const db = require('../config/database');
const notificationService = require('./notificationService');

// Reminder windows, in milliseconds before the deadline.
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const REMINDER_WINDOWS = {
  almost_due_3d: { days: 3, flag: 'reminder_3d_sent', priority: 2, type: 'warning' },
  almost_due_2d: { days: 2, flag: 'reminder_2d_sent', priority: 3, type: 'warning' },
  almost_due_1d: { days: 1, flag: 'reminder_1d_sent', priority: 3, type: 'warning' },
};

const OVERDUE_GRACE_MS = 5 * 60 * 60 * 1000; // 5 min grace before flagging overdue

function isExpiredNotification(notification) {
  return Boolean(notification && notification.expires_at && new Date() > new Date(notification.expires_at));
}

// Resolve the department that "owns" a task, used to find its department head.
// A task is owned by a department when its client carries a department_id
// (clients are optionally scoped to a department within their SOP business).
async function resolveTaskDepartment(task) {
  if (!task) return null;
  if (task.department_id != null) {
    return { id: Number(task.department_id) };
  }
  if (task.client_id != null) {
    const [rows] = await db.query(
      'SELECT id, business_id, department_id FROM clients WHERE id = ? LIMIT 1',
      [task.client_id]
    );
    const client = rows[0];
    if (client && client.department_id != null) {
      return { id: Number(client.department_id), business_id: client.business_id };
    }
  }
  return null;
}

// Resolve the SOP business that "owns" a task, used to find the admins who
// should be notified. Prefers the task's own business_id, then the client's
// business_id, then the department's business_id.
async function resolveTaskBusiness(task) {
  if (!task) return null;
  if (task.business_id != null) return Number(task.business_id);
  if (task.client_id != null) {
    const [rows] = await db.query(
      'SELECT business_id FROM clients WHERE id = ? LIMIT 1',
      [task.client_id]
    );
    if (rows[0] && rows[0].business_id != null) return Number(rows[0].business_id);
  }
  const dept = await resolveTaskDepartment(task);
  if (dept && dept.business_id != null) return Number(dept.business_id);
  return null;
}

// All users assigned to a task (User / Department / Position assignments),
// each tagged with their role so callers can decide who gets pushed.
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
    if (a.assignment_type === 'User') userIds.add(Number(a.reference_id));
    else if (a.assignment_type === 'Department') deptIds.add(Number(a.reference_id));
    else if (a.assignment_type === 'Position') positions.add(a.reference_id);
  }

  const conditions = [];
  const params = [];
  if (userIds.size) { conditions.push('id IN (?)'); params.push([...userIds]); }
  if (deptIds.size) { conditions.push('department_id IN (?)'); params.push([...deptIds]); }
  if (positions.size) { conditions.push('position_title IN (?)'); params.push([...positions]); }
  if (!conditions.length) return [];

  const [users] = await db.query(
    `SELECT id, role FROM users WHERE is_active = 1 AND (${conditions.join(' OR ')})`,
    params
  );
  return users.map((u) => ({ id: u.id, role: u.role }));
}

// The department head (if any) for the department that owns the task.
async function resolveDepartmentHead(departmentId) {
  if (departmentId == null) return null;
  const [rows] = await db.query(
    `SELECT id, role FROM users WHERE is_active = 1 AND role = 'department_head' AND department_id = ? LIMIT 1`,
    [departmentId]
  );
  return rows[0] || null;
}

// Business-scoped admins (super_admin / admin) for the business that owns the
// task. Department heads are deliberately excluded — the head of the task's
// *owning* department is notified separately, so including every department
// head here would ping the wrong ones.
async function resolveBusinessAdmins(businessId) {
  if (businessId == null) return [];
  const [rows] = await db.query(
    `SELECT id, role, business_id FROM users WHERE is_active = 1 AND role IN ('super_admin', 'admin')`,
    []
  );
  return (rows || []).filter((u) => {
    if (u.role === 'super_admin') return true;
    if (u.role === 'admin') {
      return u.business_id != null && Number(u.business_id) === Number(businessId);
    }
    return false;
  });
}

// Every super_admin in the system, regardless of business scope.
async function resolveSuperAdmins() {
  const [rows] = await db.query(
    `SELECT id, role FROM users WHERE is_active = 1 AND role = 'super_admin'`
  );
  return (rows || []).map((u) => ({ id: u.id, role: u.role }));
}

// Build the human-readable message body for a reminder kind.
function buildBody(task, kind) {
  const title = task.title || 'Your task';
  if (kind === 'overdue') {
    return `The task "${title}" is past its due date. Please update its status.`;
  }
  const days = REMINDER_WINDOWS[kind]?.days;
  return `The task "${title}" is due in ${days} day${days > 1 ? 's' : ''}. Please review it.`;
}

// Determine which reminder kind should fire for a task right now, based on
// its deadline and which flags are already set. Mirrors the scheduler's
// logic so an immediate check and the periodic scan agree on what to fire.
function nextKindForTask(task, now) {
  if (!task || !task.deadline_datetime) return null;
  const deadline = new Date(task.deadline_datetime).getTime();
  if (Number.isNaN(deadline)) return null;

  const timeLeft = deadline - now;

  if (timeLeft <= -OVERDUE_GRACE_MS) {
    if (!task.reminder_overdue_sent) return 'overdue';
    return null;
  }
if (timeLeft <= 0) return null;

  // Pick the MOST URGENT unfired countdown (shortest window first). Checking
  // longest-first would label a task due tomorrow as "due in 3 days" (it
  // matches the 3d window first), then "2 days", then "1 day" on subsequent
  // scans — three stale labels before the accurate one. Shortest-first fires
  // the correct day immediately and still progresses naturally as the deadline
  // approaches (3d -> 2d -> 1d for a task created with 3 days left).
  for (const kind of ['almost_due_1d', 'almost_due_2d', 'almost_due_3d']) {
    const spec = REMINDER_WINDOWS[kind];
    if (timeLeft <= spec.days * MS_PER_DAY && !task[spec.flag]) {
      return kind;
    }
  }

  return null;
}
// Fire any reminder that is currently due for a task, without waiting for the
// next scan cycle. Used immediately after createTask / updateTask so a task
// created or re-dated with an imminent deadline notifies the moment it
// happens. Marks the corresponding flag so the scheduler won't re-fire.
// Returns the kind that fired (or null). Safe to call repeatedly — already-sent
// flags prevent duplicate notifications.
async function notifyIfDue(task) {
  if (!task || !task.id) return null;
  const kind = nextKindForTask(task, nowMs());
  if (!kind) return null;
  await notifyTaskDueReminder(task, kind);
  await markSent(task.id, kind);
  return kind;
}

function nowMs() {
  return Date.now();
}

async function markSent(taskId, kind) {
  if (!kind || kind === 'overdue') {
    await db.query('UPDATE tasks SET reminder_overdue_sent = 1 WHERE id = ?', [taskId]);
    return;
  }
  const flag = REMINDER_WINDOWS[kind]?.flag;
  if (!flag) return;
  await db.query(`UPDATE tasks SET ${flag} = 1 WHERE id = ?`, [taskId]);
}

// Fire a due-date reminder for a task to every relevant recipient. Returns the
// set of notification ids created.
//
// Recipient scoping is kind-aware:
//   - 3d / 2d / 1d countdowns -> employees assigned to the task + the owning
//     department head. (No admins — they only care about overdue.)
//   - overdue -> the same set PLUS business-scoped admins (super_admin + admin)
//     for the owning business, PLUS the whole super_admin corps regardless of
//     business scope.
async function notifyTaskDueReminder(task, kind) {
  if (!task || !task.id) return [];
  const isOverdue = kind === 'overdue';

  const [assignees, department, businessId] = await Promise.all([
    resolveAssignedUsers(task.id),
    resolveTaskDepartment(task),
    resolveTaskBusiness(task),
  ]);

  const recipients = new Map();
  // 1. Every employee assigned to the task (incl. admins assigned directly).
  for (const u of assignees) {
    if (u && u.id) recipients.set(u.id, { id: u.id, role: u.role });
  }
  // 2. The department head of the department that owns the task.
  if (department && department.id) {
    const head = await resolveDepartmentHead(department.id);
    if (head && head.id) recipients.set(head.id, { id: head.id, role: head.role });
  }
  // 3. Overdue only: business-scoped admins (super_admin + admin) for the
  //    owning business, plus the whole super_admin corps regardless of scope.
  if (isOverdue) {
    const admins = await resolveBusinessAdmins(businessId);
    for (const a of admins) {
      if (a && a.id) recipients.set(a.id, { id: a.id, role: a.role });
    }
    const supers = await resolveSuperAdmins();
    for (const s of supers) {
      if (s && s.id) recipients.set(s.id, { id: s.id, role: s.role });
    }
  }

  const link = `/tasks/my?task=${task.id}`;
  const taskName = task.title || 'Your task';
  let title;
  if (isOverdue) {
    title = `Task "${taskName}" is overdue`;
  } else {
    const days = REMINDER_WINDOWS[kind]?.days;
    title = `Task "${taskName}" is due in ${days} day${days > 1 ? 's' : ''}`;
  }
  const body = buildBody(task, kind);

  const priority = isOverdue ? 3 : (REMINDER_WINDOWS[kind]?.priority || 2);

  const ids = [];
  for (const r of recipients.values()) {
    const id = await notificationService.createNotification({
      userId: r.id,
      title,
      body,
      type: 'warning',
      link,
      entityType: 'task',
      entityId: task.id,
      priority,
      category: 'task',
      // Push/sound are gated by the recipient's own preferences inside
      // createNotification; never force them here.
    });
    if (id) ids.push(id);
  }
  return ids;
}

module.exports = {
  MS_PER_DAY,
  REMINDER_WINDOWS,
  OVERDUE_GRACE_MS,
  notifyTaskDueReminder,
  notifyIfDue,
  nextKindForTask,
  resolveTaskDepartment,
  resolveTaskBusiness,
  resolveAssignedUsers,
  resolveDepartmentHead,
  resolveBusinessAdmins,
  resolveSuperAdmins,
  buildBody,
  isExpiredNotification,
  markSent,
};
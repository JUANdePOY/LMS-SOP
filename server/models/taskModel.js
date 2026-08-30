const db = require('../config/database');
const { computeAutoStatus, deriveParentStatus } = require('../utils/taskStatus');

// MySQL DATETIME columns reject ISO-8601 strings (e.g. "2026-08-30T02:33:30.495Z").
// Convert them to "YYYY-MM-DD HH:MM:SS"; pass through values already in that shape.
function toMysqlDateTime(value) {
  if (!value) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];

async function create(data) {
  const {
    title, description, priority, status, start_datetime, deadline_datetime,
    estimated_hours, category, created_by, parent_task_id, client_id,
    client_business_id, business_id, project_id
  } = data;

  const [result] = await db.query(
    `INSERT INTO tasks (
       title, description, priority, status, start_datetime, deadline_datetime,
       estimated_hours, category, created_by, parent_task_id, client_id,
       client_business_id, business_id, project_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      description || null,
      priority ?? null,
      status ?? null,
      start_datetime ? toMysqlDateTime(start_datetime) : null,
      deadline_datetime ? toMysqlDateTime(deadline_datetime) : null,
      estimated_hours || null,
      category || null,
      created_by,
      parent_task_id ?? null,
      client_id ?? null,
      client_business_id ?? null,
      business_id ?? null,
      project_id ?? null,
    ]
  );
  return result.insertId;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT t.*, u.full_name AS created_by_name,
            cl.client_name,
            cb.business_name AS client_business_name,
            b.business_name AS business_name, b.business_code AS business_code
     FROM tasks t
     LEFT JOIN users u ON t.created_by = u.id
     LEFT JOIN clients cl ON t.client_id = cl.id
     LEFT JOIN client_businesses cb ON t.client_business_id = cb.id
     LEFT JOIN businesses b ON t.business_id = b.id
     WHERE t.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByParentId(parentId) {
  const [rows] = await db.query(
    `SELECT t.* FROM tasks t WHERE t.parent_task_id = ?`,
    [parentId]
  );
  return rows;
}

async function findAll(filters = {}) {
  const {
    status, priority, category, search, created_by, task_ids, project_id, project_ids, page = 1, limit = 20
  } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT t.*, u.full_name AS created_by_name,
           cl.client_name,
           cb.business_name AS client_business_name,
           b.business_name AS business_name, b.business_code AS business_code
    FROM tasks t
    LEFT JOIN users u ON t.created_by = u.id
    LEFT JOIN clients cl ON t.client_id = cl.id
    LEFT JOIN client_businesses cb ON t.client_business_id = cb.id
    LEFT JOIN businesses b ON t.business_id = b.id
    WHERE 1 = 1
  `;
  const params = [];

  if (status && status !== 'all') {
    sql += ' AND t.status = ?';
    params.push(status);
  }
  if (priority && priority !== 'all') {
    sql += ' AND t.priority = ?';
    params.push(priority);
  }
  if (category) {
    sql += ' AND t.category = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (created_by) {
    sql += ' AND t.created_by = ?';
    params.push(created_by);
  }
  if (task_ids && Array.isArray(task_ids) && task_ids.length > 0) {
    sql += ' AND t.id IN (?)';
    params.push(task_ids);
  }
  if (project_id) {
    sql += ' AND t.project_id = ?';
    params.push(project_id);
  }
  if (project_ids && Array.isArray(project_ids) && project_ids.length > 0) {
    sql += ' AND t.project_id IN (?)';
    params.push(project_ids);
  }

  sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM tasks t WHERE 1 = 1';
  const countParams = [];
  if (status && status !== 'all') {
    countSql += ' AND t.status = ?';
    countParams.push(status);
  }
  if (priority && priority !== 'all') {
    countSql += ' AND t.priority = ?';
    countParams.push(priority);
  }
  if (category) {
    countSql += ' AND t.category = ?';
    countParams.push(category);
  }
  if (search) {
    countSql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`);
  }
  if (created_by) {
    countSql += ' AND t.created_by = ?';
    countParams.push(created_by);
  }
  if (task_ids && Array.isArray(task_ids) && task_ids.length > 0) {
    countSql += ' AND t.id IN (?)';
    countParams.push(task_ids);
  }
  if (project_id) {
    countSql += ' AND t.project_id = ?';
    countParams.push(project_id);
  }
  if (project_ids && Array.isArray(project_ids) && project_ids.length > 0) {
    countSql += ' AND t.project_id IN (?)';
    countParams.push(project_ids);
  }

  const [countRows] = await db.query(countSql, countParams);

  return {
    rows,
    total: countRows[0]?.total ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countRows[0]?.total ?? 0) / limit),
  };
}

async function update(id, updates) {
  const allowed = [
    'title', 'description', 'priority', 'status',
    'start_datetime', 'deadline_datetime', 'estimated_hours', 'category',
    'parent_task_id', 'client_id', 'client_business_id', 'business_id', 'project_id'
  ];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${key} = ?`);
      const v = updates[key];
      params.push(key === 'start_datetime' || key === 'deadline_datetime' ? toMysqlDateTime(v) : v);
    }
  }

  if (!sets.length) return 0;
  params.push(id);

  const [result] = await db.query(
    `UPDATE tasks SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function remove(id) {
  const [result] = await db.query('DELETE FROM tasks WHERE id = ?', [id]);
  return result.affectedRows;
}

async function getStats(filters = {}) {
  const { task_ids } = filters;

  // Restrict to the same set of tasks the table renders for this user
  // (business-scoped for admins, assigned for regular users).
  let where = 'WHERE 1 = 1';
  const params = [];
  if (Array.isArray(task_ids) && task_ids.length > 0) {
    where += ' AND id IN (?)';
    params.push(task_ids);
  }

  const [rows] = await db.query(
    `SELECT id, parent_task_id, status, start_datetime, deadline_datetime
     FROM tasks ${where}`,
    params
  );

  const presentIds = new Set(rows.map((r) => r.id));
  const autoStatus = new Map();
  const childrenMap = {};

  for (const r of rows) {
    autoStatus.set(r.id, computeAutoStatus(r.start_datetime, r.deadline_datetime, r.status));
  }

  for (const r of rows) {
    if (r.parent_task_id != null) {
      if (!childrenMap[r.parent_task_id]) childrenMap[r.parent_task_id] = [];
      childrenMap[r.parent_task_id].push(r.id);
    }
  }

  const stats = {
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
    cancelled: 0,
    by_priority: {},
  };

  const topLevelIds = [];

  for (const r of rows) {
    // A child whose parent is outside the result set is promoted to top-level
    // (exactly like the task list) so it is still counted.
    const isTopLevel = r.parent_task_id == null || !presentIds.has(r.parent_task_id);
    if (!isTopLevel) continue;

    let finalStatus = autoStatus.get(r.id);

    const children = childrenMap[r.id];
    if (children && children.length > 0) {
      const childStatuses = children.map((cid) => autoStatus.get(cid));
      const derived = deriveParentStatus(childStatuses);
      // A Cancelled parent is left as-is; otherwise use the derived status so a
      // parent with all-completed children counts as Completed, etc.
      if (derived && finalStatus !== 'Cancelled') {
        finalStatus = derived;
      }
    }

    stats.total += 1;
    topLevelIds.push(r.id);
    const key = finalStatus.toLowerCase().replace(' ', '_');
    if (stats[key] !== undefined) stats[key] += 1;
  }

  if (topLevelIds.length > 0) {
    const [priorityRows] = await db.query(
      `SELECT priority, COUNT(*) AS count FROM tasks WHERE id IN (?)`,
      [topLevelIds]
    );
    for (const row of priorityRows) {
      stats.by_priority[row.priority.toLowerCase()] = Number(row.count);
    }
  }

  return stats;
}

module.exports = {
  TASK_PRIORITIES,
  TASK_STATUSES,
  create,
  findById,
  findByParentId,
  findAll,
  update,
  remove,
  getStats,
};

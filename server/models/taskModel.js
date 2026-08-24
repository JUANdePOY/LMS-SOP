const db = require('../config/database');

const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];

async function create(data) {
  const {
    title, description, priority, status, start_datetime, deadline_datetime,
    estimated_hours, category, created_by, parent_task_id, client_id,
    client_business_id, business_id
  } = data;

  const [result] = await db.query(
    `INSERT INTO tasks (
       title, description, priority, status, start_datetime, deadline_datetime,
       estimated_hours, category, created_by, parent_task_id, client_id,
       client_business_id, business_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      description || null,
      priority || 'Medium',
      status || 'Pending',
      start_datetime,
      deadline_datetime,
      estimated_hours || null,
      category || null,
      created_by,
      parent_task_id ?? null,
      client_id ?? null,
      client_business_id ?? null,
      business_id ?? null,
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
    status, priority, category, search, created_by, task_ids, page = 1, limit = 20
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
    'parent_task_id', 'client_id', 'client_business_id', 'business_id'
  ];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${key} = ?`);
      params.push(updates[key]);
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
  const { created_by } = filters;

  // Only count top-level tasks so the KPI card matches the task table, which
  // renders only tasks without a parent (subtasks are nested under parents
  // and therefore excluded from the row list).
  let whereClause = 'WHERE parent_task_id IS NULL';
  const params = [];

  if (created_by) {
    whereClause += ' AND created_by = ?';
    params.push(created_by);
  }

  const [statusRows] = await db.query(
    `SELECT status, COUNT(*) AS count FROM tasks ${whereClause} GROUP BY status`,
    params
  );

  const [priorityRows] = await db.query(
    `SELECT priority, COUNT(*) AS count FROM tasks ${whereClause} GROUP BY priority`,
    params
  );

  // A "Pending" task whose deadline has already passed is effectively Overdue, so
  // it counts as Overdue (not Pending). Both counts are parent-scoped by the
  // whereClause above, keeping the KPI card consistent with the task table.
  const [overdueRows] = await db.query(
    `SELECT COUNT(*) AS count FROM tasks ${whereClause} AND (status = 'Overdue' OR (status = 'Pending' AND deadline_datetime < NOW()))`,
    params
  );

  const [pendingRows] = await db.query(
    `SELECT COUNT(*) AS count FROM tasks ${whereClause} AND status = 'Pending' AND deadline_datetime >= NOW()`,
    params
  );

  const stats = {
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
    cancelled: 0,
    by_priority: {},
  };

  for (const row of statusRows) {
    stats.total += Number(row.count);
    const key = row.status.toLowerCase().replace(' ', '_');
    stats[key] = Number(row.count);
  }

  for (const row of priorityRows) {
    stats.by_priority[row.priority.toLowerCase()] = Number(row.count);
  }

  stats.pending = Number(pendingRows[0]?.count || 0);
  stats.overdue = Number(overdueRows[0]?.count || 0);

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

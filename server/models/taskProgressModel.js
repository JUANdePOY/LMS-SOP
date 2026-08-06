const db = require('../config/database');

const PROGRESS_STATUSES = ['Pending', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];

async function create(data) {
  const { task_id, user_id, completion_rate, status, notes } = data;

  const [result] = await db.query(
    `INSERT INTO task_progress (task_id, user_id, completion_rate, status, notes)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       completion_rate = VALUES(completion_rate),
       status = VALUES(status),
       notes = VALUES(notes),
       updated_at = CURRENT_TIMESTAMP`,
    [
      task_id,
      user_id,
      completion_rate || 0,
      status || 'Pending',
      notes || null,
    ]
  );
  return result.insertId;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT tp.*, u.full_name AS user_name, t.title AS task_title
     FROM task_progress tp
     LEFT JOIN users u ON tp.user_id = u.id
     LEFT JOIN tasks t ON tp.task_id = t.id
     WHERE tp.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByTaskId(taskId) {
  const [rows] = await db.query(
    `SELECT tp.*, u.full_name AS user_name, u.email AS user_email
     FROM task_progress tp
     LEFT JOIN users u ON tp.user_id = u.id
     WHERE tp.task_id = ?
     ORDER BY tp.updated_at DESC`,
    [taskId]
  );
  return rows;
}

async function findByTaskAndUser(taskId, userId) {
  const [rows] = await db.query(
    'SELECT * FROM task_progress WHERE task_id = ? AND user_id = ? LIMIT 1',
    [taskId, userId]
  );
  return rows[0] || null;
}

async function findByUserId(userId, filters = {}) {
  const { status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT tp.*, t.title AS task_title, t.priority AS task_priority,
           t.deadline_datetime, t.start_datetime, t.category AS task_category,
           u.full_name AS created_by_name
    FROM task_progress tp
    JOIN tasks t ON tp.task_id = t.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE tp.user_id = ?
  `;
  const params = [userId];

  if (status && status !== 'all') {
    sql += ' AND tp.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY t.deadline_datetime ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM task_progress tp WHERE tp.user_id = ?';
  const countParams = [userId];
  if (status && status !== 'all') {
    countSql += ' AND tp.status = ?';
    countParams.push(status);
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
  const allowed = ['completion_rate', 'status', 'notes'];
  const sets = ['updated_at = CURRENT_TIMESTAMP'];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${key} = ?`);
      params.push(updates[key]);
    }
  }

  if (sets.length === 1) return 0;
  params.push(id);

  const [result] = await db.query(
    `UPDATE task_progress SET ${sets.join(', ')} WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function updateByTaskAndUser(taskId, userId, updates) {
  const allowed = ['completion_rate', 'status', 'notes'];
  const sets = ['updated_at = CURRENT_TIMESTAMP'];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${key} = ?`);
      params.push(updates[key]);
    }
  }

  if (sets.length === 1) return 0;
  params.push(taskId, userId);

  const [result] = await db.query(
    `UPDATE task_progress SET ${sets.join(', ')} WHERE task_id = ? AND user_id = ?`,
    params
  );
  return result.affectedRows;
}

async function remove(id) {
  const [result] = await db.query('DELETE FROM task_progress WHERE id = ?', [id]);
  return result.affectedRows;
}

module.exports = {
  PROGRESS_STATUSES,
  create,
  findById,
  findByTaskId,
  findByTaskAndUser,
  findByUserId,
  update,
  updateByTaskAndUser,
  remove,
};

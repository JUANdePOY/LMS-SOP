const db = require('../config/database');

async function create(data) {
  const { task_id, user_id, comment, parent_id } = data;

  const [result] = await db.query(
    `INSERT INTO task_comments (task_id, user_id, comment, parent_id)
     VALUES (?, ?, ?, ?)`,
    [task_id, user_id, comment, parent_id || null]
  );
  return result.insertId;
}

async function findByTaskId(taskId) {
  const [rows] = await db.query(
    `SELECT tc.*, u.full_name AS user_name, u.role AS user_role
     FROM task_comments tc
     LEFT JOIN users u ON tc.user_id = u.id
     WHERE tc.task_id = ?
     ORDER BY tc.created_at ASC`,
    [taskId]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT tc.*, u.full_name AS user_name, u.role AS user_role
     FROM task_comments tc
     LEFT JOIN users u ON tc.user_id = u.id
     WHERE tc.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function remove(id) {
  const [result] = await db.query('DELETE FROM task_comments WHERE id = ?', [id]);
  return result.affectedRows;
}

async function removeByTaskId(taskId) {
  const [result] = await db.query('DELETE FROM task_comments WHERE task_id = ?', [taskId]);
  return result.affectedRows;
}

module.exports = {
  create,
  findByTaskId,
  findById,
  remove,
  removeByTaskId,
};

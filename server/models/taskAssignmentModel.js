const db = require('../config/database');

const ASSIGNMENT_TYPES = ['User', 'Department', 'Position'];

async function create(data) {
  const { task_id, assignment_type, reference_id, assigned_by } = data;

  const [result] = await db.query(
    `INSERT INTO task_assignments (task_id, assignment_type, reference_id, assigned_by)
     VALUES (?, ?, ?, ?)`,
    [task_id, assignment_type, reference_id, assigned_by]
  );
  return result.insertId;
}

async function findByTaskId(taskId) {
  const [rows] = await db.query(
    `SELECT ta.*, u.full_name AS assigned_by_name
     FROM task_assignments ta
     LEFT JOIN users u ON ta.assigned_by = u.id
     WHERE ta.task_id = ?
     ORDER BY ta.assigned_at ASC`,
    [taskId]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    'SELECT * FROM task_assignments WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function removeByTaskAndRef(taskId, assignmentType, referenceId) {
  const [result] = await db.query(
    'DELETE FROM task_assignments WHERE task_id = ? AND assignment_type = ? AND reference_id = ?',
    [taskId, assignmentType, referenceId]
  );
  return result.affectedRows;
}

async function findByTaskAndRef(taskId, assignmentType, referenceId) {
  const [rows] = await db.query(
    'SELECT * FROM task_assignments WHERE task_id = ? AND assignment_type = ? AND reference_id = ? LIMIT 1',
    [taskId, assignmentType, referenceId]
  );
  return rows[0] || null;
}

async function removeByTaskId(taskId) {
  const [result] = await db.query(
    'DELETE FROM task_assignments WHERE task_id = ?',
    [taskId]
  );
  return result.affectedRows;
}

async function remove(id) {
  const [result] = await db.query('DELETE FROM task_assignments WHERE id = ?', [id]);
  return result.affectedRows;
}

module.exports = {
  ASSIGNMENT_TYPES,
  create,
  findByTaskId,
  findById,
  removeByTaskAndRef,
  removeByTaskId,
  remove,
};

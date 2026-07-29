const db = require('../config/database');

const SUBMISSION_STATUSES = ['draft', 'submitted', 'graded', 'returned'];

async function listSubmissions(filters = {}) {
  const { assignment_id, user_id, status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT 
      s.*,
      u.full_name AS user_name,
      u.email AS user_email,
      a.title AS assignment_title,
      a.max_score AS assignment_max_score,
      grader.full_name AS graded_by_name
    FROM submissions s
    JOIN users u ON s.user_id = u.id
    JOIN assignments a ON s.assignment_id = a.id
    LEFT JOIN users grader ON s.graded_by = grader.id
    WHERE s.is_deleted = FALSE
  `;
  const params = [];

  if (assignment_id) {
    sql += ' AND s.assignment_id = ?';
    params.push(assignment_id);
  }
  if (user_id) {
    sql += ' AND s.user_id = ?';
    params.push(user_id);
  }
  if (status) {
    sql += ' AND s.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY s.submitted_at DESC, s.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT 
      s.*,
      u.full_name AS user_name,
      a.title AS assignment_title,
      a.max_score AS assignment_max_score
     FROM submissions s
     JOIN users u ON s.user_id = u.id
     JOIN assignments a ON s.assignment_id = a.id
     WHERE s.id = ? AND s.is_deleted = FALSE
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create(submissionData) {
  const { assignment_id, user_id, content, file_path, file_name, status } = submissionData;

  const [result] = await db.query(
    `INSERT INTO submissions (assignment_id, user_id, content, file_path, file_name, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      assignment_id,
      user_id,
      content ?? null,
      file_path ?? null,
      file_name ?? null,
      status || 'submitted',
    ]
  );
  return result.insertId;
}

async function update(id, updates) {
  const allowed = ['content', 'file_path', 'file_name', 'score', 'feedback', 'status', 'graded_at', 'graded_by'];
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
    `UPDATE submissions SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE`,
    params
  );
  return result.affectedRows;
}

async function softDelete(id) {
  const [result] = await db.query(
    'UPDATE submissions SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  return result.affectedRows;
}

async function getUserSubmissions(userId, assignmentId) {
  const [rows] = await db.query(
    'SELECT * FROM submissions WHERE user_id = ? AND assignment_id = ? AND is_deleted = FALSE ORDER BY created_at DESC',
    [userId, assignmentId]
  );
  return rows;
}

module.exports = {
  listSubmissions,
  findById,
  create,
  update,
  softDelete,
  getUserSubmissions,
  SUBMISSION_STATUSES,
};

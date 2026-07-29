const db = require('../config/database');

async function listAssignments(courseId, filters = {}) {
  const { module_id, status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let sql = 'SELECT * FROM assignments WHERE course_id = ? AND is_deleted = FALSE';
  const params = [courseId];

  if (module_id) {
    sql += ' AND module_id = ?';
    params.push(module_id);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY due_date ASC, created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    'SELECT * FROM assignments WHERE id = ? AND is_deleted = FALSE LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create(assignmentData) {
  const { course_id, module_id, title, description, due_date, max_score, submission_type, allow_late_submission, late_penalty, status } = assignmentData;

  const [result] = await db.query(
    `INSERT INTO assignments (
      course_id, module_id, title, description, due_date, max_score, submission_type, allow_late_submission, late_penalty, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      course_id,
      module_id ?? null,
      title,
      description ?? null,
      due_date ?? null,
      max_score || 100,
      submission_type || 'text',
      allow_late_submission ?? true,
      late_penalty ?? null,
      status || 'draft',
    ]
  );
  return result.insertId;
}

async function update(id, updates) {
  const allowed = ['title', 'description', 'due_date', 'max_score', 'submission_type', 'allow_late_submission', 'late_penalty', 'status', 'module_id'];
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
    `UPDATE assignments SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE`,
    params
  );
  return result.affectedRows;
}

async function softDelete(id) {
  const [result] = await db.query(
    'UPDATE assignments SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  return result.affectedRows;
}

module.exports = {
  listAssignments,
  findById,
  create,
  update,
  softDelete,
};

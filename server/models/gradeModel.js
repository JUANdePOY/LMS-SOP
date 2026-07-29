const db = require('../config/database');

async function listGrades(filters = {}) {
  const { course_id, user_id, item_id, item_type, is_finalized, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT 
      g.*,
      u.full_name AS user_name,
      u.email AS user_email,
      grader.full_name AS graded_by_name
    FROM grades g
    JOIN users u ON g.user_id = u.id
    LEFT JOIN users grader ON g.graded_by = grader.id
    WHERE g.is_deleted = FALSE
  `;
  const params = [];

  if (course_id) {
    sql += ' AND g.course_id = ?';
    params.push(course_id);
  }
  if (user_id) {
    sql += ' AND g.user_id = ?';
    params.push(user_id);
  }
  if (item_id) {
    sql += ' AND g.item_id = ?';
    params.push(item_id);
  }
  if (item_type) {
    sql += ' AND g.item_type = ?';
    params.push(item_type);
  }
  if (is_finalized !== undefined) {
    sql += ' AND g.is_finalized = ?';
    params.push(is_finalized);
  }

  sql += ' ORDER BY g.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT 
      g.*,
      u.full_name AS user_name
     FROM grades g
     JOIN users u ON g.user_id = u.id
     WHERE g.id = ? AND g.is_deleted = FALSE
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create(gradeData) {
  const { course_id, user_id, item_id, item_type, score, max_score, letter_grade, feedback, graded_by, is_finalized, is_released } = gradeData;

  const [result] = await db.query(
    `INSERT INTO grades (
      course_id, user_id, item_id, item_type, score, max_score, letter_grade, feedback, graded_by, is_finalized, is_released
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      course_id,
      user_id,
      item_id ?? null,
      item_type || 'course',
      score || 0,
      max_score || 100,
      letter_grade ?? null,
      feedback ?? null,
      graded_by ?? null,
      is_finalized ?? false,
      is_released ?? false,
    ]
  );
  return result.insertId;
}

async function update(id, updates) {
  const allowed = ['score', 'max_score', 'letter_grade', 'feedback', 'graded_by', 'is_finalized', 'is_released'];
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
    `UPDATE grades SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE`,
    params
  );
  return result.affectedRows;
}

async function softDelete(id) {
  const [result] = await db.query(
    'UPDATE grades SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  return result.affectedRows;
}

async function getGradebook(courseId) {
  const [rows] = await db.query(
    `SELECT 
      g.user_id,
      u.full_name AS user_name,
      u.email AS user_email,
      SUM(g.score) AS total_score,
      SUM(g.max_score) AS total_max_score,
      ROUND(100.0 * SUM(g.score) / NULLIF(SUM(g.max_score), 0), 2) AS percentage,
      MAX(g.letter_grade) AS letter_grade,
      MAX(g.is_released) AS is_released
     FROM grades g
     JOIN users u ON g.user_id = u.id
     WHERE g.course_id = ? AND g.is_deleted = FALSE AND g.item_type = 'course'
     GROUP BY g.user_id, u.full_name, u.email
     ORDER BY percentage DESC`,
    [courseId]
  );
  return rows;
}

module.exports = {
  listGrades,
  findById,
  create,
  update,
  softDelete,
  getGradebook,
};

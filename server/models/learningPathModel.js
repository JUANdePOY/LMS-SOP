const db = require('../config/database');

async function listPaths(filters = {}) {
  const { department_id, status, page = 1, limit = 50, business_id } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT lp.*, d.name AS department_name,
           (SELECT COUNT(*) FROM learning_path_courses lpc WHERE lpc.path_id = lp.id) AS course_count
    FROM learning_paths lp
    LEFT JOIN departments d ON lp.department_id = d.id
    WHERE 1 = 1
  `;
  const params = [];

  if (department_id) {
    sql += ' AND lp.department_id = ?';
    params.push(department_id);
  }
  if (status) {
    sql += ' AND lp.is_active = ?';
    params.push(status === 'active' ? 1 : 0);
  }
  if (business_id) {
    sql += ' AND d.business_id = ?';
    params.push(parseInt(business_id, 10));
  }

  sql += ' ORDER BY lp.title ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT lp.*, d.name AS department_name
     FROM learning_paths lp
     LEFT JOIN departments d ON lp.department_id = d.id
     WHERE lp.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function getPathCourses(pathId) {
  const [rows] = await db.query(
    `SELECT c.id, c.title, c.description, c.category, c.difficulty, c.thumbnail_url,
            c.status, lpc.position, lpc.is_required, u.full_name AS instructor_name
     FROM learning_path_courses lpc
     JOIN courses c ON c.id = lpc.course_id AND c.is_deleted = FALSE
     LEFT JOIN users u ON c.instructor_id = u.id
     WHERE lpc.path_id = ?
     ORDER BY lpc.position ASC, c.title ASC`,
    [pathId]
  );
  return rows;
}

async function create(data) {
  const { title, description, department_id, is_active = 1 } = data;
  const [result] = await db.query(
    `INSERT INTO learning_paths (title, description, department_id, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [title, description ?? null, department_id ?? null, is_active ? 1 : 0]
  );
  return result.insertId;
}

async function update(id, data) {
  const sets = [];
  const params = [];
  if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title); }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }
  if (data.department_id !== undefined) { sets.push('department_id = ?'); params.push(data.department_id); }
  if (data.is_active !== undefined) { sets.push('is_active = ?'); params.push(data.is_active ? 1 : 0); }
  if (!sets.length) return 0;
  params.push(id);
  const [result] = await db.query(
    `UPDATE learning_paths SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function addCourse(pathId, courseId, position = 0, isRequired = 1) {
  const [result] = await db.query(
    `INSERT IGNORE INTO learning_path_courses (path_id, course_id, position, is_required, created_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [pathId, courseId, position, isRequired ? 1 : 0]
  );
  return result.affectedRows;
}

async function removeCourse(pathId, courseId) {
  const [result] = await db.query(
    'DELETE FROM learning_path_courses WHERE path_id = ? AND course_id = ?',
    [pathId, courseId]
  );
  return result.affectedRows;
}

async function reorderCourse(pathId, courseId, position) {
  const [result] = await db.query(
    'UPDATE learning_path_courses SET position = ? WHERE path_id = ? AND course_id = ?',
    [position, pathId, courseId]
  );
  return result.affectedRows;
}

module.exports = {
  listPaths,
  findById,
  getPathCourses,
  create,
  update,
  addCourse,
  removeCourse,
  reorderCourse,
};

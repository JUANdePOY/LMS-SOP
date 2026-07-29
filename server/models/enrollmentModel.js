const db = require('../config/database');

const ENROLLMENT_STATUSES = ['pending', 'active', 'completed', 'dropped', 'suspended'];
const COURSE_ROLES = ['instructor', 'teaching_assistant', 'learner', 'guest'];

async function listEnrollments(filters = {}) {
  const { course_id, user_id, status, role, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT 
      e.*,
      u.full_name AS user_name,
      u.email AS user_email,
      c.title AS course_title
    FROM course_enrollments e
    JOIN users u ON e.user_id = u.id
    JOIN courses c ON e.course_id = c.id
    WHERE e.is_deleted = FALSE
  `;
  const params = [];

  if (course_id) {
    sql += ' AND e.course_id = ?';
    params.push(course_id);
  }
  if (user_id) {
    sql += ' AND e.user_id = ?';
    params.push(user_id);
  }
  if (status) {
    sql += ' AND e.status = ?';
    params.push(status);
  }
  if (role) {
    sql += ' AND e.role = ?';
    params.push(role);
  }

  sql += ' ORDER BY e.enrolled_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT 
      e.*,
      u.full_name AS user_name,
      u.email AS user_email,
      c.title AS course_title
     FROM course_enrollments e
     JOIN users u ON e.user_id = u.id
     JOIN courses c ON e.course_id = c.id
     WHERE e.id = ? AND e.is_deleted = FALSE
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByCourseAndUser(courseId, userId) {
  const [rows] = await db.query(
    'SELECT * FROM course_enrollments WHERE course_id = ? AND user_id = ? AND is_deleted = FALSE LIMIT 1',
    [courseId, userId]
  );
  return rows[0] || null;
}

async function create(enrollmentData) {
  const { course_id, user_id, role, status } = enrollmentData;

  const [result] = await db.query(
    `INSERT INTO course_enrollments (course_id, user_id, role, status) VALUES (?, ?, ?, ?)`,
    [
      course_id,
      user_id,
      role || 'learner',
      status || 'active',
    ]
  );
  return result.insertId;
}

async function bulkCreate(enrollments) {
  if (!enrollments.length) return [];
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const ids = [];
    for (const e of enrollments) {
      const [result] = await conn.query(
        'INSERT INTO course_enrollments (course_id, user_id, role, status) VALUES (?, ?, ?, ?)',
        [e.course_id, e.user_id, e.role || 'learner', e.status || 'active']
      );
      ids.push(result.insertId);
    }
    await conn.commit();
    return ids;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function update(id, updates) {
  const allowed = ['role', 'status', 'progress_percentage', 'final_grade', 'completed_at'];
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
    `UPDATE course_enrollments SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE`,
    params
  );
  return result.affectedRows;
}

async function softDelete(id) {
  const [result] = await db.query(
    'UPDATE course_enrollments SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  return result.affectedRows;
}

async function getClassProgress(courseId) {
  const [rows] = await db.query(
    `SELECT 
      user_id,
      COUNT(DISTINCT cp.content_id) AS completed_items,
      COUNT(DISTINCT mc.id) AS total_items,
      ROUND(100.0 * COUNT(DISTINCT cp.content_id) / NULLIF(COUNT(DISTINCT mc.id), 0), 2) AS progress_percentage
     FROM course_enrollments e
     LEFT JOIN content_progress cp ON e.id = cp.enrollment_id AND cp.is_completed = TRUE
     LEFT JOIN course_modules cm ON e.course_id = cm.course_id AND cm.is_deleted = FALSE
     LEFT JOIN module_content mc ON cm.id = mc.module_id AND mc.is_deleted = FALSE
     WHERE e.course_id = ? AND e.status = 'active' AND e.is_deleted = FALSE
     GROUP BY e.user_id`,
    [courseId]
  );
  return rows;
}

module.exports = {
  listEnrollments,
  findById,
  findByCourseAndUser,
  create,
  bulkCreate,
  update,
  softDelete,
  getClassProgress,
  ENROLLMENT_STATUSES,
  COURSE_ROLES,
};

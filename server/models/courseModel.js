const db = require('../config/database');

const COURSE_STATUSES = ['draft', 'published', 'archived', 'under_review'];
const COURSE_DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'all_levels'];

async function listCourses(filters = {}) {
  const { search, status, category, difficulty, instructor_id, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT 
      c.id, c.title, c.description, c.category, c.difficulty, c.status,
      c.instructor_id, c.thumbnail_url, c.max_enrollments, c.start_date, c.end_date,
      c.grading_scale, c.allow_self_enrollment, c.send_completion_certificates,
      c.created_at, c.updated_at,
      u.full_name AS instructor_name,
      COUNT(DISTINCT e.id) AS enrollment_count,
      COUNT(DISTINCT m.id) AS module_count
    FROM courses c
    LEFT JOIN users u ON c.instructor_id = u.id
    LEFT JOIN course_enrollments e ON c.id = e.course_id AND e.status = 'active' AND e.is_deleted = FALSE
    LEFT JOIN course_modules m ON c.id = m.course_id AND m.is_deleted = FALSE
    WHERE c.is_deleted = FALSE
  `;
  const params = [];

  if (status) {
    sql += ' AND c.status = ?';
    params.push(status);
  }
  if (category) {
    sql += ' AND c.category = ?';
    params.push(category);
  }
  if (difficulty) {
    sql += ' AND c.difficulty = ?';
    params.push(difficulty);
  }
  if (instructor_id) {
    sql += ' AND c.instructor_id = ?';
    params.push(instructor_id);
  }
  if (search) {
    sql += ' AND (c.title LIKE ? OR c.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);
  return rows;
}

async function countCourses(filters = {}) {
  const { search, status, category, difficulty, instructor_id } = filters;

  let sql = 'SELECT COUNT(*) AS total FROM courses c WHERE c.is_deleted = FALSE';
  const params = [];

  if (status) {
    sql += ' AND c.status = ?';
    params.push(status);
  }
  if (category) {
    sql += ' AND c.category = ?';
    params.push(category);
  }
  if (difficulty) {
    sql += ' AND c.difficulty = ?';
    params.push(difficulty);
  }
  if (instructor_id) {
    sql += ' AND c.instructor_id = ?';
    params.push(instructor_id);
  }
  if (search) {
    sql += ' AND (c.title LIKE ? OR c.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const [[row]] = await db.query(sql, params);
  return row?.total ?? 0;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT 
      c.*, 
      u.full_name AS instructor_name,
      COUNT(DISTINCT e.id) AS enrollment_count,
      COUNT(DISTINCT m.id) AS module_count
     FROM courses c
     LEFT JOIN users u ON c.instructor_id = u.id
     LEFT JOIN course_enrollments e ON c.id = e.course_id AND e.status = 'active' AND e.is_deleted = FALSE
     LEFT JOIN course_modules m ON c.id = m.course_id AND m.is_deleted = FALSE
     WHERE c.id = ? AND c.is_deleted = FALSE
     GROUP BY c.id`,
    [id]
  );
  return rows[0] || null;
}

async function create(courseData) {
  const {
    title, description, category, difficulty, instructor_id, thumbnail_url,
    prerequisites, learning_outcomes, max_enrollments, start_date, end_date,
    grading_scale, allow_self_enrollment, send_completion_certificates, status
  } = courseData;

  const [result] = await db.query(
    `INSERT INTO courses (
      title, description, category, difficulty, status, instructor_id, thumbnail_url,
      prerequisites, learning_outcomes, max_enrollments, start_date, end_date,
      grading_scale, allow_self_enrollment, send_completion_certificates
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      description ?? null,
      category ?? null,
      difficulty || 'beginner',
      status || 'draft',
      instructor_id ?? null,
      thumbnail_url ?? null,
      prerequisites ? JSON.stringify(prerequisites) : null,
      learning_outcomes ? JSON.stringify(learning_outcomes) : null,
      max_enrollments ?? null,
      start_date ?? null,
      end_date ?? null,
      grading_scale || 'STANDARD',
      allow_self_enrollment ?? true,
      send_completion_certificates ?? false,
    ]
  );
  return result.insertId;
}

async function update(id, updates) {
  const allowed = [
    'title', 'description', 'category', 'difficulty', 'status', 'instructor_id',
    'thumbnail_url', 'prerequisites', 'learning_outcomes', 'max_enrollments',
    'start_date', 'end_date', 'grading_scale', 'allow_self_enrollment',
    'send_completion_certificates'
  ];

  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      let value = updates[key];
      if ((key === 'prerequisites' || key === 'learning_outcomes') && value && typeof value === 'object') {
        value = JSON.stringify(value);
      }
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (!sets.length) return 0;
  params.push(id);

  const [result] = await db.query(
    `UPDATE courses SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE`,
    params
  );
  return result.affectedRows;
}

async function softDelete(id) {
  const [result] = await db.query(
    'UPDATE courses SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  return result.affectedRows;
}

async function isInstructor(courseId, userId) {
  const [rows] = await db.query(
    `SELECT id FROM course_enrollments 
     WHERE course_id = ? AND user_id = ? AND role IN ('instructor', 'teaching_assistant') 
     AND status = 'active' AND is_deleted = FALSE 
     LIMIT 1`,
    [courseId, userId]
  );
  return rows.length > 0;
}

async function isEnrolled(courseId, userId) {
  const [rows] = await db.query(
    `SELECT id FROM course_enrollments 
     WHERE course_id = ? AND user_id = ? AND status IN ('active', 'pending', 'completed') 
     AND is_deleted = FALSE 
     LIMIT 1`,
    [courseId, userId]
  );
  return rows.length > 0;
}

module.exports = {
  db,
  listCourses,
  countCourses,
  findById,
  create,
  update,
  softDelete,
  isInstructor,
  isEnrolled,
  COURSE_STATUSES,
  COURSE_DIFFICULTIES,
};

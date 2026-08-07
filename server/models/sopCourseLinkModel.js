const db = require('../config/database');

async function listByCourse(courseId) {
  const [rows] = await db.query(`
    SELECT 
      scl.id,
      scl.sop_id,
      scl.course_id,
      scl.module_id,
      scl.display_order,
      scl.is_required,
      scl.link_type,
      scl.created_by,
      scl.created_at,
      s.title AS sop_title,
      s.sop_code AS sop_code,
      s.status AS sop_status,
      s.department_id AS sop_department_id,
      u.full_name AS created_by_name
    FROM sop_course_links scl
    JOIN sops s ON s.id = scl.sop_id
    LEFT JOIN users u ON u.id = scl.created_by
    WHERE scl.course_id = ? AND scl.deleted_at IS NULL
    ORDER BY scl.display_order ASC, scl.id ASC
  `, [parseInt(courseId, 10)]);
  return rows;
}

async function listBySop(sopId) {
  const [rows] = await db.query(`
    SELECT 
      scl.id,
      scl.sop_id,
      scl.course_id,
      scl.module_id,
      scl.display_order,
      scl.is_required,
      scl.link_type,
      scl.created_at,
      c.title AS course_title,
      c.status AS course_status
    FROM sop_course_links scl
    JOIN courses c ON c.id = scl.course_id
    WHERE scl.sop_id = ? AND scl.deleted_at IS NULL
    ORDER BY scl.display_order ASC, scl.id ASC
  `, [parseInt(sopId, 10)]);
  return rows;
}

async function listByCourseAndSop(courseId, sopId) {
  const [rows] = await db.query(`
    SELECT * FROM sop_course_links
    WHERE course_id = ? AND sop_id = ? AND deleted_at IS NULL
    LIMIT 1
  `, [parseInt(courseId, 10), parseInt(sopId, 10)]);
  return rows[0] || null;
}

function toValidIntOrNull(value, fieldName) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    const error = new Error(`Invalid ${fieldName}: expected a number`);
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
  return parsed;
}

function toValidIntOrThrow(value, fieldName) {
  const parsed = toValidIntOrNull(value, fieldName);
  if (parsed === null) {
    const error = new Error(`${fieldName} is required`);
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
  return parsed;
}

async function create(linkData) {
  const { course_id, sop_id, module_id, display_order, is_required, link_type, created_by } = linkData;

  const courseIdValue = toValidIntOrThrow(course_id, 'course_id');
  const sopIdValue = toValidIntOrThrow(sop_id, 'sop_id');
  const moduleIdValue = toValidIntOrNull(module_id, 'module_id');
  const createdByValue = toValidIntOrNull(created_by, 'created_by');

  const [result] = await db.query(
    `INSERT INTO sop_course_links 
     (course_id, sop_id, module_id, display_order, is_required, link_type, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      courseIdValue,
      sopIdValue,
      moduleIdValue,
      display_order ?? 0,
      is_required ? 1 : 0,
      link_type || 'Reference',
      createdByValue,
    ]
  );
  return result.insertId;
}

async function remove(courseId, sopId) {
  const [result] = await db.query(
    `UPDATE sop_course_links SET deleted_at = NOW() WHERE course_id = ? AND sop_id = ? AND deleted_at IS NULL`,
    [parseInt(courseId, 10), parseInt(sopId, 10)]
  );
  return result.affectedRows;
}

async function removeByCourse(courseId) {
  const [result] = await db.query(
    `UPDATE sop_course_links SET deleted_at = NOW() WHERE course_id = ? AND deleted_at IS NULL`,
    [parseInt(courseId, 10)]
  );
  return result.affectedRows;
}

async function isLinkedToActiveEnrollment(sopId, userId) {
  const [rows] = await db.query(`
    SELECT 1 FROM sop_course_links scl
    JOIN course_enrollments ce ON ce.course_id = scl.course_id 
      AND ce.user_id = ? 
      AND ce.status IN ('active', 'completed') 
      AND ce.is_deleted = FALSE
    WHERE scl.sop_id = ? AND scl.deleted_at IS NULL
    LIMIT 1
  `, [parseInt(userId, 10), parseInt(sopId, 10)]);
  return rows.length > 0;
}

module.exports = {
  listByCourse,
  listBySop,
  listByCourseAndSop,
  create,
  remove,
  removeByCourse,
  isLinkedToActiveEnrollment,
};
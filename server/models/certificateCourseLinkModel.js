const db = require('../config/database');

async function listByCourse(courseId) {
  const [rows] = await db.query(`
    SELECT 
      ccl.id,
      ccl.certificate_template_id,
      ccl.course_id,
      ccl.is_default,
      ccl.display_order,
      ccl.created_by,
      ccl.created_at,
      ct.name AS template_name,
      ct.status AS template_status,
      ct.orientation AS template_orientation,
      ct.width_px AS template_width_px,
      ct.height_px AS template_height_px,
      u.full_name AS created_by_name
    FROM certificate_course_links ccl
    JOIN certificate_templates ct ON ct.id = ccl.certificate_template_id AND ct.is_deleted = 0
    LEFT JOIN users u ON u.id = ccl.created_by
    WHERE ccl.course_id = ? AND ccl.deleted_at IS NULL
    ORDER BY ccl.is_default DESC, ccl.display_order ASC, ccl.id ASC
  `, [parseInt(courseId, 10)]);
  return rows;
}

async function listByTemplate(templateId) {
  const [rows] = await db.query(`
    SELECT 
      ccl.id,
      ccl.certificate_template_id,
      ccl.course_id,
      ccl.is_default,
      ccl.display_order,
      ccl.created_by,
      ccl.created_at,
      c.title AS course_title,
      c.status AS course_status
    FROM certificate_course_links ccl
    JOIN courses c ON c.id = ccl.course_id AND c.is_deleted = FALSE
    WHERE ccl.certificate_template_id = ? AND ccl.deleted_at IS NULL
    ORDER BY ccl.display_order ASC, ccl.id ASC
  `, [parseInt(templateId, 10)]);
  return rows;
}

async function findByCourseAndTemplate(courseId, templateId) {
  const [rows] = await db.query(`
    SELECT * FROM certificate_course_links
    WHERE course_id = ? AND certificate_template_id = ? AND deleted_at IS NULL
    LIMIT 1
  `, [parseInt(courseId, 10), parseInt(templateId, 10)]);
  return rows[0] || null;
}

async function findDefaultByCourse(courseId) {
  const [rows] = await db.query(`
    SELECT * FROM certificate_course_links
    WHERE course_id = ? AND is_default = 1 AND deleted_at IS NULL
    ORDER BY display_order ASC, id ASC
    LIMIT 1
  `, [parseInt(courseId, 10)]);
  return rows[0] || null;
}

async function create(linkData) {
  const { certificate_template_id, course_id, is_default, display_order, created_by } = linkData;
  const [result] = await db.query(
    `INSERT INTO certificate_course_links 
     (certificate_template_id, course_id, is_default, display_order, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [
      parseInt(certificate_template_id, 10),
      parseInt(course_id, 10),
      is_default ? 1 : 0,
      display_order ?? 0,
      created_by ? parseInt(created_by, 10) : null,
    ]
  );
  return result.insertId;
}

async function update(id, updates) {
  const allowed = ['is_default', 'display_order'];
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
    `UPDATE certificate_course_links SET ${sets.join(', ')}, created_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
    params
  );
  return result.affectedRows;
}

async function remove(courseId, templateId) {
  const [result] = await db.query(
    `UPDATE certificate_course_links SET deleted_at = NOW() WHERE course_id = ? AND certificate_template_id = ? AND deleted_at IS NULL`,
    [parseInt(courseId, 10), parseInt(templateId, 10)]
  );
  return result.affectedRows;
}

async function removeByCourse(courseId) {
  const [result] = await db.query(
    `UPDATE certificate_course_links SET deleted_at = NOW() WHERE course_id = ? AND deleted_at IS NULL`,
    [parseInt(courseId, 10)]
  );
  return result.affectedRows;
}

async function isLinked(courseId, templateId) {
  const [rows] = await db.query(`
    SELECT 1 FROM certificate_course_links
    WHERE course_id = ? AND certificate_template_id = ? AND deleted_at IS NULL
    LIMIT 1
  `, [parseInt(courseId, 10), parseInt(templateId, 10)]);
  return rows.length > 0;
}

module.exports = {
  listByCourse,
  listByTemplate,
  findByCourseAndTemplate,
  findDefaultByCourse,
  create,
  update,
  remove,
  removeByCourse,
  isLinked,
};

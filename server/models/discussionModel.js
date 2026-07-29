const db = require('../config/database');

async function listDiscussions(courseId, filters = {}) {
  const { module_id, is_closed, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT 
      d.*,
      u.full_name AS created_by_name
    FROM discussions d
    LEFT JOIN users u ON d.created_by = u.id
    WHERE d.course_id = ? AND d.is_deleted = FALSE
  `;
  const params = [courseId];

  if (module_id) {
    sql += ' AND d.module_id = ?';
    params.push(module_id);
  }
  if (is_closed !== undefined) {
    sql += ' AND d.is_closed = ?';
    params.push(is_closed);
  }

  sql += ' ORDER BY d.is_pinned DESC, d.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT 
      d.*,
      u.full_name AS created_by_name
     FROM discussions d
     LEFT JOIN users u ON d.created_by = u.id
     WHERE d.id = ? AND d.is_deleted = FALSE
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create(discussionData) {
  const { course_id, module_id, title, description, created_by, is_pinned } = discussionData;

  const [result] = await db.query(
    `INSERT INTO discussions (course_id, module_id, title, description, created_by, is_pinned)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      course_id,
      module_id ?? null,
      title,
      description ?? null,
      created_by ?? null,
      is_pinned ?? false,
    ]
  );
  return result.insertId;
}

async function update(id, updates) {
  const allowed = ['title', 'description', 'is_pinned', 'is_closed', 'reply_count'];
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
    `UPDATE discussions SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE`,
    params
  );
  return result.affectedRows;
}

async function softDelete(id) {
  const [result] = await db.query(
    'UPDATE discussions SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  return result.affectedRows;
}

async function incrementReplyCount(discussionId) {
  const [result] = await db.query(
    'UPDATE discussions SET reply_count = reply_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [discussionId]
  );
  return result.affectedRows;
}

async function listReplies(discussionId) {
  const [rows] = await db.query(
    `SELECT 
      r.*,
      u.full_name AS user_name
     FROM discussion_replies r
     JOIN users u ON r.user_id = u.id
     WHERE r.discussion_id = ? AND r.is_deleted = FALSE
     ORDER BY r.created_at ASC`,
    [discussionId]
  );
  return rows;
}

async function createReply(replyData) {
  const { discussion_id, parent_reply_id, user_id, reply_text, is_instructor, is_pinned } = replyData;

  const [result] = await db.query(
    `INSERT INTO discussion_replies (discussion_id, parent_reply_id, user_id, reply_text, is_instructor, is_pinned)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      discussion_id,
      parent_reply_id ?? null,
      user_id,
      reply_text,
      is_instructor ?? false,
      is_pinned ?? false,
    ]
  );
  return result.insertId;
}

module.exports = {
  listDiscussions,
  findById,
  create,
  update,
  softDelete,
  incrementReplyCount,
  listReplies,
  createReply,
};

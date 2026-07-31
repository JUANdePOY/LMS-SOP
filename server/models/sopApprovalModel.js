const db = require('../config/database');

// Real schema: sop_approvals(id, sop_id, sop_version_id, approver_user_id,
// status, comments, created_at, updated_at, is_deleted) — NOT deleted_at

async function getApprovals(sopId) {
  const [rows] = await db.query(
    `SELECT a.*, u.full_name AS approver_name
     FROM sop_approvals a
     LEFT JOIN users u ON a.approver_user_id = u.id
     WHERE a.sop_id = ? AND a.is_deleted = FALSE
     ORDER BY a.created_at ASC`,
    [sopId]
  );
  return rows;
}

async function getApprovalById(id) {
  const [rows] = await db.query(
    'SELECT * FROM sop_approvals WHERE id = ? AND is_deleted = FALSE',
    [id]
  );
  return rows[0] || null;
}

async function createApproval(data) {
  const {
    sop_id,
    sop_version_id,
    approver_user_id,
    status = 'pending',
    comments = null,
  } = data;

  const [result] = await db.query(
    'INSERT INTO sop_approvals (sop_id, sop_version_id, approver_user_id, status, comments, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    [sop_id, sop_version_id || null, approver_user_id, status, comments]
  );

  return result.insertId;
}

async function updateApproval(id, data) {
  const { status, comments } = data;
  const updates = [];
  const params = [];

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (comments !== undefined) {
    updates.push('comments = ?');
    params.push(comments);
  }

  if (updates.length === 0) return null;

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  await db.query(
    'UPDATE sop_approvals SET ' + updates.join(', ') + ' WHERE id = ?',
    params
  );

  return id;
}

module.exports = {
  getApprovals,
  getApprovalById,
  createApproval,
  updateApproval,
};
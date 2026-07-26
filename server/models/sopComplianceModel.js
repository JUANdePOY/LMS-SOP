const db = require('../config/database');

async function listAssignments(sopId) {
  const [rows] = await db.query(`
    SELECT sa.*, d.name AS department_name, u.full_name AS user_name
    FROM sop_assignments sa
    LEFT JOIN departments d ON sa.department_id = d.id
    LEFT JOIN users u ON sa.user_id = u.id
    WHERE sa.sop_id = ? AND sa.is_deleted = FALSE
    ORDER BY sa.created_at DESC
  `, [sopId]);
  return rows;
}

async function findAssignmentById(id) {
  const [rows] = await db.query(`
    SELECT sa.*, d.name AS department_name, u.full_name AS user_name
    FROM sop_assignments sa
    LEFT JOIN departments d ON sa.department_id = d.id
    LEFT JOIN users u ON sa.user_id = u.id
    WHERE sa.id = ? AND sa.is_deleted = FALSE
  `, [id]);
  return rows[0] || null;
}

async function findDuplicateAssignment({ sop_id, assignment_type, department_id, position_title, user_id }) {
  let sql = `
    SELECT id FROM sop_assignments
    WHERE sop_id = ? AND assignment_type = ? AND is_deleted = FALSE
  `;
  const params = [sop_id, assignment_type];

  if (assignment_type === 'Department') {
    sql += ' AND department_id = ?';
    params.push(department_id);
  } else if (assignment_type === 'Position') {
    sql += ' AND LOWER(position_title) = LOWER(?)';
    params.push(position_title);
  } else {
    sql += ' AND user_id = ?';
    params.push(user_id);
  }

  const [rows] = await db.query(sql, params);
  return rows[0] || null;
}

async function createAssignment(data) {
  const { sop_id, assignment_type, department_id, position_title, user_id, assigned_by } = data;
  const [result] = await db.query(`
    INSERT INTO sop_assignments (
      sop_id, assignment_type, department_id, position_title, user_id, assigned_by, is_deleted, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [sop_id, assignment_type || 'User', department_id || null, position_title || null, user_id || null, assigned_by || null]);
  return result.insertId;
}

async function softDeleteAssignment(id) {
  const [result] = await db.query(`
    UPDATE sop_assignments
    SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_deleted = FALSE
  `, [id]);
  return result.affectedRows;
}

async function resolveUsersForDepartment(departmentId) {
  const [rows] = await db.query(`
    SELECT DISTINCT u.id
    FROM users u
    LEFT JOIN department_members dm ON dm.user_id = u.id AND dm.department_id = ?
    WHERE u.is_active = TRUE
      AND (u.department_id = ? OR dm.user_id IS NOT NULL)
  `, [departmentId, departmentId]);
  return rows.map((row) => row.id);
}

async function resolveUsersForPosition(positionTitle) {
  const [rows] = await db.query(`
    SELECT id FROM users
    WHERE is_active = TRUE AND LOWER(position_title) = LOWER(?)
  `, [positionTitle]);
  return rows.map((row) => row.id);
}

async function listAcknowledgements(sopId, { status } = {}) {
  let sql = `
    SELECT sa.*, u.full_name AS user_name, u.email AS user_email
    FROM sop_acknowledgements sa
    LEFT JOIN users u ON sa.user_id = u.id
    WHERE sa.sop_id = ? AND sa.is_deleted = FALSE
  `;
  const params = [sopId];

  if (status) {
    sql += ' AND sa.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY sa.created_at DESC';
  const [rows] = await db.query(sql, params);
  return rows;
}

async function listAcknowledgementsByUser(userId, { status } = {}) {
  let sql = `
    SELECT sa.*, s.title AS sop_title, s.code AS sop_code, s.status AS sop_status
    FROM sop_acknowledgements sa
    INNER JOIN sops s ON sa.sop_id = s.id AND s.is_deleted = FALSE
    WHERE sa.user_id = ? AND sa.is_deleted = FALSE
  `;
  const params = [userId];

  if (status) {
    sql += ' AND sa.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY sa.updated_at DESC';
  const [rows] = await db.query(sql, params);
  return rows;
}

async function findAcknowledgementBySopAndUser(sopId, userId) {
  const [rows] = await db.query(`
    SELECT * FROM sop_acknowledgements
    WHERE sop_id = ? AND user_id = ? AND is_deleted = FALSE
    LIMIT 1
  `, [sopId, userId]);
  return rows[0] || null;
}

async function createAcknowledgement(data) {
  const { sop_id, user_id, status = 'Pending' } = data;
  const [result] = await db.query(`
    INSERT INTO sop_acknowledgements (sop_id, user_id, status, is_deleted, created_at, updated_at)
    VALUES (?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [sop_id, user_id, status]);
  return result.insertId;
}

async function updateAcknowledgementStatus(sopId, userId, status) {
  const [result] = await db.query(`
    UPDATE sop_acknowledgements
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE sop_id = ? AND user_id = ? AND is_deleted = FALSE
  `, [status, sopId, userId]);
  return result.affectedRows;
}

async function acknowledge(sopId, userId) {
  const [result] = await db.query(`
    UPDATE sop_acknowledgements
    SET status = 'Acknowledged', updated_at = CURRENT_TIMESTAMP
    WHERE sop_id = ? AND user_id = ? AND is_deleted = FALSE
  `, [sopId, userId]);
  return result.affectedRows;
}

async function getAcknowledgementStats(sopId) {
  const [rows] = await db.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'Acknowledged' THEN 1 ELSE 0 END) AS acknowledged,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending
    FROM sop_acknowledgements
    WHERE sop_id = ? AND is_deleted = FALSE
  `, [sopId]);
  const stats = rows[0] || { total: 0, acknowledged: 0, pending: 0 };
  return {
    total: Number(stats.total) || 0,
    acknowledged: Number(stats.acknowledged) || 0,
    pending: Number(stats.pending) || 0,
  };
}

async function listApprovals(sopId) {
  const [rows] = await db.query(`
    SELECT sa.*, u.full_name AS approver_name
    FROM sop_approvals sa
    LEFT JOIN users u ON sa.approver_user_id = u.id
    WHERE sa.sop_id = ? AND sa.is_deleted = FALSE
    ORDER BY sa.created_at DESC
  `, [sopId]);
  return rows;
}

async function createApproval(data) {
  const { sop_id, approver_user_id, status = 'Pending', comments } = data;
  const [result] = await db.query(`
    INSERT INTO sop_approvals (sop_id, approver_user_id, status, comments, is_deleted, created_at, updated_at)
    VALUES (?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [sop_id, approver_user_id, status, comments || null]);
  return result.insertId;
}

async function updateApproval(id, data) {
  const { status, comments } = data;
  const [result] = await db.query(`
    UPDATE sop_approvals
    SET status = ?, comments = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_deleted = FALSE
  `, [status, comments || null, id]);
  return result.affectedRows;
}

module.exports = {
  listAssignments,
  findAssignmentById,
  findDuplicateAssignment,
  createAssignment,
  softDeleteAssignment,
  resolveUsersForDepartment,
  resolveUsersForPosition,
  listAcknowledgements,
  listAcknowledgementsByUser,
  findAcknowledgementBySopAndUser,
  createAcknowledgement,
  updateAcknowledgementStatus,
  acknowledge,
  getAcknowledgementStats,
  listApprovals,
  createApproval,
  updateApproval,
};

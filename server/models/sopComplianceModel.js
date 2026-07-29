const db = require('../config/database');
const { getCurrentVersionId, ensureCurrentVersion } = require('./sopVersionModel');

// ---------- Assignments ----------
// Real schema: sop_assignments(id, public_id, sop_version_id, assigned_by,
// assigned_at, due_date, notes) is a single "assignment event" — it has no
// assignment_type/department_id/position_title/user_id/is_deleted columns.
// The actual targets live in junction tables:
//   assignment_departments(id, assignment_id, department_id)
//   assignment_positions(id, assignment_id, position_name)
//   assignment_users(id, assignment_id, user_id)
// So one assignment CAN target several departments/positions/users at once,
// but sopAssignmentService.js (the actual caller) still creates one
// assignment per single target and expects flat assignment_type/
// department_id/position_title/user_id fields back, plus a
// findDuplicateAssignment() check. Both are reconstructed below from the
// junction rows so that service keeps working unmodified.

function deriveFlatFields({ departments, positions, users }) {
  if (departments.length === 1 && positions.length === 0 && users.length === 0) {
    return {
      assignment_type: 'Department',
      department_id: departments[0].department_id,
      department_name: departments[0].department_name,
      position_title: null,
      user_id: null,
    };
  }
  if (positions.length === 1 && departments.length === 0 && users.length === 0) {
    return { assignment_type: 'Position', position_title: positions[0], department_id: null, user_id: null };
  }
  if (users.length === 1 && departments.length === 0 && positions.length === 0) {
    return {
      assignment_type: 'User',
      user_id: users[0].user_id,
      user_name: users[0].user_name,
      department_id: null,
      position_title: null,
    };
  }
  // Multi-target assignment (created via the array-based payload) — no
  // single flat type applies.
  return { assignment_type: 'Mixed', department_id: null, position_title: null, user_id: null };
}

async function listAssignments(sopId) {
  const versionId = await getCurrentVersionId(sopId);
  if (!versionId) return [];

  const [assignments] = await db.query(`
    SELECT sa.*, u.full_name AS assigned_by_name
    FROM sop_assignments sa
    LEFT JOIN users u ON sa.assigned_by = u.id
    WHERE sa.sop_version_id = ? AND sa.is_deleted = FALSE
    ORDER BY sa.assigned_at DESC
  `, [versionId]);

  if (!assignments.length) return [];
  const ids = assignments.map((a) => a.id);

  const [depts] = await db.query(`
    SELECT ad.assignment_id, ad.department_id, d.name AS department_name
    FROM assignment_departments ad
    LEFT JOIN departments d ON ad.department_id = d.id
    WHERE ad.assignment_id IN (?)
  `, [ids]);
  const [positions] = await db.query(
    'SELECT assignment_id, position_name FROM assignment_positions WHERE assignment_id IN (?)',
    [ids],
  );
  const [users] = await db.query(`
    SELECT au.assignment_id, au.user_id, u.full_name AS user_name
    FROM assignment_users au
    LEFT JOIN users u ON au.user_id = u.id
    WHERE au.assignment_id IN (?)
  `, [ids]);

  return assignments.map((a) => {
    const grouped = {
      departments: depts.filter((d) => d.assignment_id === a.id),
      positions: positions.filter((p) => p.assignment_id === a.id).map((p) => p.position_name),
      users: users.filter((u) => u.assignment_id === a.id),
    };
    return { ...a, ...grouped, ...deriveFlatFields(grouped) };
  });
}

async function findAssignmentById(id) {
  const [rows] = await db.query(`
    SELECT sa.*, u.full_name AS assigned_by_name
    FROM sop_assignments sa
    LEFT JOIN users u ON sa.assigned_by = u.id
    WHERE sa.id = ?
  `, [id]);
  const assignment = rows[0];
  if (!assignment) return null;

  const [deptRows] = await db.query(`
    SELECT ad.department_id, d.name AS department_name
    FROM assignment_departments ad
    LEFT JOIN departments d ON ad.department_id = d.id
    WHERE ad.assignment_id = ?
  `, [id]);
  const [positionRows] = await db.query('SELECT position_name FROM assignment_positions WHERE assignment_id = ?', [id]);
  const [userRows] = await db.query(`
    SELECT au.user_id, u.full_name AS user_name
    FROM assignment_users au
    LEFT JOIN users u ON au.user_id = u.id
    WHERE au.assignment_id = ?
  `, [id]);

  const grouped = {
    departments: deptRows,
    positions: positionRows.map((p) => p.position_name),
    users: userRows,
  };

  return {
    ...assignment,
    department_ids: deptRows.map((d) => d.department_id),
    position_names: positionRows.map((p) => p.position_name),
    user_ids: userRows.map((u) => u.user_id),
    ...deriveFlatFields(grouped),
  };
}

// Reconstructed for sopAssignmentService.js, which still checks for a
// duplicate single-target assignment before creating a new one. "Duplicate"
// here means the current version already has an assignment targeting that
// same department/position/user, regardless of which assignment row it's
// attached to.
async function findDuplicateAssignment({ sop_id, assignment_type, department_id, position_title, user_id }) {
  const versionId = await getCurrentVersionId(sop_id);
  if (!versionId) return null;

  if (assignment_type === 'Department') {
    const [rows] = await db.query(`
      SELECT sa.id FROM sop_assignments sa
      INNER JOIN assignment_departments ad ON ad.assignment_id = sa.id
      WHERE sa.sop_version_id = ? AND sa.is_deleted = FALSE AND ad.department_id = ?
      LIMIT 1
    `, [versionId, department_id]);
    return rows[0] || null;
  }

  if (assignment_type === 'Position') {
    const [rows] = await db.query(`
      SELECT sa.id FROM sop_assignments sa
      INNER JOIN assignment_positions ap ON ap.assignment_id = sa.id
      WHERE sa.sop_version_id = ? AND sa.is_deleted = FALSE AND LOWER(ap.position_name) = LOWER(?)
      LIMIT 1
    `, [versionId, position_title]);
    return rows[0] || null;
  }

  const [rows] = await db.query(`
    SELECT sa.id FROM sop_assignments sa
    INNER JOIN assignment_users au ON au.assignment_id = sa.id
    WHERE sa.sop_version_id = ? AND sa.is_deleted = FALSE AND au.user_id = ?
    LIMIT 1
  `, [versionId, user_id]);
  return rows[0] || null;
}

async function createAssignment(data) {
  const { sop_id, due_date, notes, assigned_by } = data;

  // The current UI (SOPCreateWizard) still sends the legacy single-target
  // shape — {assignment_type, department_id | position_title | user_id} —
  // one call per target, rather than the array-based
  // {department_ids[], position_names[], user_ids[]} payload this schema
  // is built for. Accept both: prefer arrays if present, otherwise
  // translate the legacy single-target fields into a one-item array.
  const department_ids = data.department_ids
    ?? (data.assignment_type === 'Department' && data.department_id != null ? [data.department_id] : []);
  const position_names = data.position_names
    ?? (data.assignment_type === 'Position' && data.position_title ? [data.position_title] : []);
  const user_ids = data.user_ids
    ?? (data.assignment_type === 'User' && data.user_id != null ? [data.user_id] : []);

  const versionId = await ensureCurrentVersion(sop_id, assigned_by);

  const [result] = await db.query(`
    INSERT INTO sop_assignments (sop_version_id, assigned_by, assigned_at, due_date, notes)
    VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
  `, [versionId, assigned_by || null, due_date || null, notes || null]);

  const assignmentId = result.insertId;

  for (const departmentId of department_ids) {
    await db.query('INSERT INTO assignment_departments (assignment_id, department_id) VALUES (?, ?)', [assignmentId, departmentId]);
  }
  for (const positionName of position_names) {
    await db.query('INSERT INTO assignment_positions (assignment_id, position_name) VALUES (?, ?)', [assignmentId, positionName]);
  }
  for (const userId of user_ids) {
    await db.query('INSERT INTO assignment_users (assignment_id, user_id) VALUES (?, ?)', [assignmentId, userId]);
  }

  return assignmentId;
}

// sop_assignments DOES have an is_deleted column on the real schema, so
// mark it deleted rather than hard-deleting the row (and its junction
// rows, which cascade-delete via FK anyway once the parent is gone — but
// we're keeping the parent row now, so leave the targeting rows alone too).
async function softDeleteAssignment(id) {
  const [result] = await db.query('UPDATE sop_assignments SET is_deleted = TRUE WHERE id = ?', [id]);
  return result.affectedRows;
}

// Unchanged — department_members and users.department_id/position_title
// already match the real schema.
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

// ---------- Acknowledgements ----------
// Real schema: sop_acknowledgements(id, public_id, sop_version_id, user_id,
// status, acknowledged_at, ip_address, user_agent, remarks, created_at) —
// keyed off sop_version_id, and there is no is_deleted/updated_at column.

async function listAcknowledgements(sopId, { status } = {}) {
  const versionId = await getCurrentVersionId(sopId);
  if (!versionId) return [];

  let sql = `
    SELECT sa.*, u.full_name AS user_name, u.email AS user_email
    FROM sop_acknowledgements sa
    LEFT JOIN users u ON sa.user_id = u.id
    WHERE sa.sop_version_id = ?
  `;
  const params = [versionId];

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
    SELECT sa.*, s.title AS sop_title, s.sop_code AS sop_code, sv.status AS sop_status
    FROM sop_acknowledgements sa
    INNER JOIN sop_versions sv ON sa.sop_version_id = sv.id AND sv.deleted_at IS NULL
    INNER JOIN sops s ON sv.sop_id = s.id AND s.deleted_at IS NULL
    WHERE sa.user_id = ?
  `;
  const params = [userId];

  if (status) {
    sql += ' AND sa.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY sa.created_at DESC';
  const [rows] = await db.query(sql, params);
  return rows;
}

async function findAcknowledgementBySopAndUser(sopId, userId) {
  const versionId = await getCurrentVersionId(sopId);
  if (!versionId) return null;
  const [rows] = await db.query(`
    SELECT * FROM sop_acknowledgements
    WHERE sop_version_id = ? AND user_id = ?
    LIMIT 1
  `, [versionId, userId]);
  return rows[0] || null;
}

async function createAcknowledgement(data) {
  const { sop_id, user_id, status = 'Pending' } = data;
  const versionId = await ensureCurrentVersion(sop_id, null);
  const [result] = await db.query(`
    INSERT INTO sop_acknowledgements (sop_version_id, user_id, status, created_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `, [versionId, user_id, status]);
  return result.insertId;
}

async function updateAcknowledgementStatus(sopId, userId, status) {
  const versionId = await getCurrentVersionId(sopId);
  if (!versionId) return 0;
  const [result] = await db.query(`
    UPDATE sop_acknowledgements
    SET status = ?
    WHERE sop_version_id = ? AND user_id = ?
  `, [status, versionId, userId]);
  return result.affectedRows;
}

async function acknowledge(sopId, userId) {
  const versionId = await getCurrentVersionId(sopId);
  if (!versionId) return 0;
  const [result] = await db.query(`
    UPDATE sop_acknowledgements
    SET status = 'Acknowledged', acknowledged_at = CURRENT_TIMESTAMP
    WHERE sop_version_id = ? AND user_id = ?
  `, [versionId, userId]);
  return result.affectedRows;
}

async function getAcknowledgementStats(sopId) {
  const versionId = await getCurrentVersionId(sopId);
  if (!versionId) return { total: 0, acknowledged: 0, pending: 0 };

  const [rows] = await db.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'Acknowledged' THEN 1 ELSE 0 END) AS acknowledged,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending
    FROM sop_acknowledgements
    WHERE sop_version_id = ?
  `, [versionId]);
  const stats = rows[0] || { total: 0, acknowledged: 0, pending: 0 };
  return {
    total: Number(stats.total) || 0,
    acknowledged: Number(stats.acknowledged) || 0,
    pending: Number(stats.pending) || 0,
  };
}

// ---------- Approvals ----------
// sop_approvals is keyed directly on sop_id with is_deleted in the real
// schema too, so this section is unchanged from the original code.

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
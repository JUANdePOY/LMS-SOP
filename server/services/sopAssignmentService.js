const db = require('../config/database');
const complianceModel = require('../models/sopComplianceModel');
const sopModel = require('../models/sopModel');
const assignmentCascadeService = require('../services/assignmentCascadeService');
const sopComplianceModel = require('../models/sopComplianceModel');
const { getCurrentVersionId } = require('../models/sopVersionModel');
const {
  normalizeAssignmentType,
  validateAssignmentPayload,
} = require('../validators/sopAssignmentValidator');
const notificationService = require('../services/notificationService');

async function departmentExists(departmentId) {
  const [rows] = await db.query('SELECT id FROM departments WHERE id = ?', [departmentId]);
  return Boolean(rows[0]);
}

async function userExists(userId) {
  const [rows] = await db.query('SELECT id FROM users WHERE id = ? AND is_active = TRUE', [userId]);
  return Boolean(rows[0]);
}

async function listAssignments(sopId) {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return complianceModel.listAssignments(sopId);
}

const ALLOWED_ASSIGNMENT_STATUSES = ['Draft', 'Approved', 'Published'];
const ALLOWED_STATUSES_LABEL = 'Draft, Approved and Published';

function getNormalizedArray(normalized, singularKey, arrayKey) {
  const arr = normalized[arrayKey];
  if (Array.isArray(arr)) return arr;
  const single = normalized[singularKey];
  return single != null ? [single] : [];
}

async function createAssignment(sopId, payload, assignedBy) {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (!ALLOWED_ASSIGNMENT_STATUSES.includes(sop.status)) {
    const error = new Error(`Cannot assign SOP with status: ${sop.status}. Only ${ALLOWED_STATUSES_LABEL} SOPs can be assigned.`);
    error.code = 'INVALID_SOP_STATUS';
    throw error;
  }

  const actor = await db.query(
    'SELECT id, role, business_id, department_id FROM users WHERE id = ?',
    [assignedBy]
  ).then(([rows]) => rows[0] || null);
  if (actor && sop.business_id && actor.business_id !== sop.business_id) {
    const error = new Error('Access denied: SOP is outside your business scope');
    error.code = 'FORBIDDEN';
    throw error;
  }

  const normalized = {
    ...payload,
    assignment_type: normalizeAssignmentType(payload.assignment_type),
  };

  const validation = validateAssignmentPayload(normalized);
  if (!validation.valid) {
    const error = new Error(validation.message);
    error.code = 'VALIDATION_ERROR';
    error.details = validation.details;
    throw error;
  }

  // The payload uses array-based fields (department_ids, position_names,
  // user_ids). Resolve them from the array form, falling back to the legacy
  // singular fields (department_id, position_title, user_id) for backwards
  // compatibility with callers that still send the single-target shape.
  const departmentIds = getNormalizedArray(normalized, 'department_id', 'department_ids');
  const positionNames = getNormalizedArray(normalized, 'position_title', 'position_names');
  const userIds = getNormalizedArray(normalized, 'user_id', 'user_ids');

  // Validate that referenced departments exist when Department or Mixed type.
  if (normalized.assignment_type === 'Department' || departmentIds.length > 0) {
    for (const deptId of departmentIds) {
      if (!(await departmentExists(deptId))) {
        const error = new Error('Department not found');
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
    }
  }

  // Validate that referenced users exist when User or Mixed type.
  if (normalized.assignment_type === 'User' || userIds.length > 0) {
    for (const userId of userIds) {
      if (!(await userExists(userId))) {
        const error = new Error('User not found or inactive');
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
    }
  }

  const duplicate = await complianceModel.findDuplicateAssignment({
    sop_id: sopId,
    department_ids: departmentIds,
    position_names: positionNames,
    user_ids: userIds,
  });

  if (duplicate) {
    const error = new Error('An identical assignment already exists for this SOP');
    error.code = 'DUPLICATE_ASSIGNMENT';
    throw error;
  }

  const id = await complianceModel.createAssignment({
    sop_id: sopId,
    assignment_type: normalized.assignment_type,
    department_ids: departmentIds,
    position_names: positionNames,
    user_ids: userIds,
    due_date: normalized.due_date || null,
    notes: normalized.notes || null,
    assigned_by: assignedBy,
  });

  // Notify each assigned employee so a banner/notification surfaces on their
  // side. Targets can include whole departments/positions, so resolve the
  // actual users and notify each once (dedup handled by the notification
  // service). Notifications are best-effort and must never fail the assignment.
  try {
    const targetUserIds = new Set();
    for (const deptId of departmentIds) {
      (await complianceModel.resolveUsersForDepartment(deptId)).forEach((uid) => targetUserIds.add(uid));
    }
    for (const positionName of positionNames) {
      (await complianceModel.resolveUsersForPosition(positionName)).forEach((uid) => targetUserIds.add(uid));
    }
    userIds.forEach((uid) => targetUserIds.add(uid));
    if (assignedBy) targetUserIds.delete(assignedBy);

    for (const uid of targetUserIds) {
      notificationService
        .createSystemNotification({
          userId: uid,
          title: 'A new SOP has been assigned to you',
          body: sop.title,
          type: 'info',
          link: `/my-learning/sops/${sopId}`,
          entityType: 'sop',
          entityId: sopId,
        })
        .catch(() => {});
    }
  } catch (notifyErr) {
    console.error('Failed to send SOP assignment notifications:', notifyErr);
  }

  return complianceModel.findAssignmentById(id);
}

async function deleteAssignment(assignmentId) {
  const assignment = await complianceModel.findAssignmentById(assignmentId);
  if (!assignment) {
    const error = new Error('Assignment not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const sop = await sopModel.findById(assignment.sop_id);
  if (sop) {
    const [actor] = await db.query(
      'SELECT id, role, business_id, department_id FROM users WHERE id = ?',
      [assignment.assigned_by || null]
    ).then(([rows]) => rows[0] || null);
    if (actor && sop.business_id && actor.business_id !== sop.business_id) {
      const error = new Error('Access denied: SOP is outside your business scope');
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  await complianceModel.softDeleteAssignment(assignmentId);
  return assignment;
}

async function resolveAssignedUserIds(sopId) {
  const assignments = await complianceModel.listAssignments(sopId);
  const userIds = new Set();

  for (const assignment of assignments) {
    if (assignment.assignment_type === 'Department' && assignment.department_id) {
      const ids = await complianceModel.resolveUsersForDepartment(assignment.department_id);
      ids.forEach((id) => userIds.add(id));
    } else if (assignment.assignment_type === 'Position' && assignment.position_title) {
      const ids = await complianceModel.resolveUsersForPosition(assignment.position_title);
      ids.forEach((id) => userIds.add(id));
    } else if (assignment.assignment_type === 'User' && assignment.user_id) {
      userIds.add(assignment.user_id);
    }
  }

  return Array.from(userIds);
}

async function isAssignedToUser(sopId, userId) {
  const versionId = await getCurrentVersionId(sopId);
  if (!versionId) return false;

  const [userRows] = await db.query(
    'SELECT department_id, position_title FROM users WHERE id = ?',
    [userId]
  );
  const user = userRows[0] || {};
  const userDept = user.department_id ?? null;
  const userPos = user.position_title ?? null;

  const [rows] = await db.query(`
    SELECT sa.id
    FROM sop_assignments sa
    LEFT JOIN assignment_users au ON au.assignment_id = sa.id AND au.user_id = ?
    LEFT JOIN assignment_departments ad ON ad.assignment_id = sa.id AND ad.department_id = ?
    LEFT JOIN assignment_positions ap ON ap.assignment_id = sa.id AND LOWER(ap.position_name) = LOWER(?)
    WHERE sa.sop_version_id = ? AND sa.is_deleted = FALSE
      AND (au.assignment_id IS NOT NULL OR ad.assignment_id IS NOT NULL OR ap.assignment_id IS NOT NULL)
    LIMIT 1
  `, [userId, userDept, userPos, versionId]);

  return rows.length > 0;
}

async function listAccessibleSops(userId, filters = {}) {
  const cols = await sopModel.getSopsColumns();
  const { search, page = 1, limit = 20, sort = 'created_at' } = filters;
  const offset = (page - 1) * limit;

  const codeCol = cols.code;
  const orderBy = sort === 'title' ? 's.title' : 's.created_at';
  const orderDir = sort === 'title' ? 'ASC' : 'DESC';

  const [userRows] = await db.query(
    'SELECT department_id, position_title FROM users WHERE id = ?',
    [userId]
  );
  const user = userRows[0] || {};
  const userDept = user.department_id ?? null;
  const userPos = user.position_title ?? null;

  const sql = `
    SELECT s.*, d.name AS department_name, c.name AS category_name, u.full_name AS owner_name
    FROM sops s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN categories c ON s.category_id = c.id
    LEFT JOIN users u ON s.${cols.owner} = u.id
    WHERE s.status = 'Published'
      AND (s.is_deleted = 0 OR s.is_deleted IS NULL)
      AND (
        EXISTS (
          SELECT 1 FROM sop_versions sv
          JOIN sop_assignments sa ON sa.sop_version_id = sv.id AND sa.is_deleted = FALSE
          WHERE sv.sop_id = s.id AND sv.is_current = TRUE AND sv.deleted_at IS NULL
            AND (
              EXISTS (SELECT 1 FROM assignment_users au WHERE au.assignment_id = sa.id AND au.user_id = ?)
              OR (? IS NOT NULL AND EXISTS (SELECT 1 FROM assignment_departments ad WHERE ad.assignment_id = sa.id AND ad.department_id = ?))
              OR (? IS NOT NULL AND EXISTS (SELECT 1 FROM assignment_positions ap WHERE ap.assignment_id = sa.id AND LOWER(ap.position_name) = LOWER(?)))
            )
        )
        OR EXISTS (
          SELECT 1 FROM module_content mc
          JOIN course_modules cm ON cm.id = mc.module_id AND cm.is_deleted = FALSE
          JOIN course_enrollments ce ON ce.course_id = cm.course_id AND ce.user_id = ? AND ce.status IN ('active', 'completed') AND ce.is_deleted = FALSE
          WHERE mc.type = 'sop' AND mc.url = CAST(s.id AS CHAR) AND mc.is_deleted = FALSE
        )
      )
  `;
  const params = [userId, userDept, userDept, userPos, userPos, userId];

  let finalSql = sql;
  if (search) {
    finalSql += ' AND (s.title LIKE ? OR s.' + codeCol + ' LIKE ? OR s.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  finalSql += ` ORDER BY ${orderBy} ${orderDir} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await db.query(finalSql, params);
  const normalizedRows = rows.map((r) => sopModel.normalizeSopRow(r, cols));

  let countSql = `
    SELECT COUNT(*) AS total FROM sops s
    WHERE s.status = 'Published'
      AND (s.is_deleted = 0 OR s.is_deleted IS NULL)
      AND (
        EXISTS (
          SELECT 1 FROM sop_versions sv
          JOIN sop_assignments sa ON sa.sop_version_id = sv.id AND sa.is_deleted = FALSE
          WHERE sv.sop_id = s.id AND sv.is_current = TRUE AND sv.deleted_at IS NULL
            AND (
              EXISTS (SELECT 1 FROM assignment_users au WHERE au.assignment_id = sa.id AND au.user_id = ?)
              OR (? IS NOT NULL AND EXISTS (SELECT 1 FROM assignment_departments ad WHERE ad.assignment_id = sa.id AND ad.department_id = ?))
              OR (? IS NOT NULL AND EXISTS (SELECT 1 FROM assignment_positions ap WHERE ap.assignment_id = sa.id AND LOWER(ap.position_name) = LOWER(?)))
            )
        )
        OR EXISTS (
          SELECT 1 FROM module_content mc
          JOIN course_modules cm ON cm.id = mc.module_id AND cm.is_deleted = FALSE
          JOIN course_enrollments ce ON ce.course_id = cm.course_id AND ce.user_id = ? AND ce.status IN ('active', 'completed') AND ce.is_deleted = FALSE
          WHERE mc.type = 'sop' AND mc.url = CAST(s.id AS CHAR) AND mc.is_deleted = FALSE
        )
      )
  `;
  const countParams = [userId, userDept, userDept, userPos, userPos, userId];
  if (search) {
    countSql += ' AND (s.title LIKE ? OR s.' + codeCol + ' LIKE ? OR s.description LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const [countRows] = await db.query(countSql, countParams);
  const total = countRows[0]?.total ?? 0;

  return {
    rows: normalizedRows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function getEmployeeSopSummary(userId) {
  const result = await listAccessibleSops(userId, { limit: 100000, page: 1, sort: 'created_at' });

  const [ackRows] = await db.query(
    `SELECT DISTINCT sv.sop_id AS sop_id
     FROM sop_acknowledgements sa
     JOIN sop_versions sv ON sa.sop_version_id = sv.id AND sv.deleted_at IS NULL
     WHERE sa.user_id = ? AND sa.status = 'Acknowledged'`,
    [userId]
  );
  const ackSet = new Set(ackRows.map((r) => r.sop_id));

  const items = (result.rows || []).map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    acknowledged: ackSet.has(r.id),
  }));

  return { total: result.total, items };
}

module.exports = {
  listAssignments,
  createAssignment,
  deleteAssignment,
  resolveAssignedUserIds,
  isAssignedToUser,
  listAccessibleSops,
  getEmployeeSopSummary,
  getAssignmentDropdowns: assignmentCascadeService.getDepartments,
  getPositionsFromDepartment: assignmentCascadeService.getPositionsForDepartment,
  getUsersFromDepartment: assignmentCascadeService.getUsersFromDepartment,
  getAssignedAssignments: assignmentCascadeService.getAssignedAssignments,
};

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

  return complianceModel.findAssignmentById(id);
}

async function deleteAssignment(assignmentId) {
  const assignment = await complianceModel.findAssignmentById(assignmentId);
  if (!assignment) {
    const error = new Error('Assignment not found');
    error.code = 'NOT_FOUND';
    throw error;
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

  const [rows] = await db.query(`
    SELECT sa.id FROM sop_assignments sa
    INNER JOIN assignment_users au ON au.assignment_id = sa.id
    WHERE sa.sop_version_id = ? AND sa.is_deleted = FALSE AND au.user_id = ?
    LIMIT 1
  `, [versionId, userId]);

  return rows.length > 0;
}

module.exports = {
  listAssignments,
  createAssignment,
  deleteAssignment,
  resolveAssignedUserIds,
  isAssignedToUser,
  getAssignmentDropdowns: assignmentCascadeService.getDepartments,
  getPositionsFromDepartment: assignmentCascadeService.getPositionsForDepartment,
  getUsersFromDepartment: assignmentCascadeService.getUsersFromDepartment,
  getAssignedAssignments: assignmentCascadeService.getAssignedAssignments,
};

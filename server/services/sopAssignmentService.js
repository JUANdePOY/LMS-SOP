const db = require('../config/database');
const complianceModel = require('../models/sopComplianceModel');
const sopModel = require('../models/sopModel');
const assignmentCascadeService = require('../services/assignmentCascadeService');
const sopComplianceModel = require('../models/sopComplianceModel');
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

async function createAssignment(sopId, payload, assignedBy) {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
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

  if (normalized.assignment_type === 'Department') {
    const exists = await departmentExists(normalized.department_id);
    if (!exists) {
      const error = new Error('Department not found');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
  }

  if (normalized.assignment_type === 'User') {
    const exists = await userExists(normalized.user_id);
    if (!exists) {
      const error = new Error('User not found or inactive');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
  }

  const duplicate = await complianceModel.findDuplicateAssignment({
    sop_id: sopId,
    assignment_type: normalized.assignment_type,
    department_id: normalized.department_id,
    position_title: normalized.position_title,
    user_id: normalized.user_id,
  });

  if (duplicate) {
    const error = new Error('An identical assignment already exists for this SOP');
    error.code = 'DUPLICATE_ASSIGNMENT';
    throw error;
  }

  const id = await complianceModel.createAssignment({
    sop_id: sopId,
    assignment_type: normalized.assignment_type,
    department_id: normalized.department_id || null,
    position_title: normalized.position_title || null,
    user_id: normalized.user_id || null,
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

module.exports = {
  listAssignments,
  createAssignment,
  deleteAssignment,
  resolveAssignedUserIds,
  getAssignmentDropdowns: assignmentCascadeService.getDepartments,
  getPositionsFromDepartment: assignmentCascadeService.getPositionsForDepartment,
  getUsersFromDepartment: assignmentCascadeService.getUsersForDepartment,
  getAssignedAssignments: assignmentCascadeService.getAssignedAssignments,
};

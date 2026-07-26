const ASSIGNMENT_TYPES = Object.freeze(['Department', 'Position', 'User']);

function normalizeAssignmentType(value) {
  const raw = String(value || 'User').trim();
  const map = {
    department: 'Department',
    position: 'Position',
    user: 'User',
    Department: 'Department',
    Position: 'Position',
    User: 'User',
  };
  return map[raw] || raw;
}

function validateAssignmentPayload(payload) {
  const assignmentType = normalizeAssignmentType(payload.assignment_type);
  const details = [];

  if (!ASSIGNMENT_TYPES.includes(assignmentType)) {
    return {
      valid: false,
      message: 'Invalid assignment type',
      details: [{ field: 'assignment_type', message: `Must be one of: ${ASSIGNMENT_TYPES.join(', ')}` }],
    };
  }

  if (assignmentType === 'Department') {
    if (!payload.department_id) {
      details.push({ field: 'department_id', message: 'Department is required for Department assignments' });
    }
    if (payload.user_id) {
      details.push({ field: 'user_id', message: 'User must not be set for Department assignments' });
    }
    if (payload.position_title) {
      details.push({ field: 'position_title', message: 'Position must not be set for Department assignments' });
    }
  }

  if (assignmentType === 'Position') {
    if (!payload.position_title || !String(payload.position_title).trim()) {
      details.push({ field: 'position_title', message: 'Position title is required for Position assignments' });
    }
    if (payload.department_id) {
      details.push({ field: 'department_id', message: 'Department must not be set for Position assignments' });
    }
    if (payload.user_id) {
      details.push({ field: 'user_id', message: 'User must not be set for Position assignments' });
    }
  }

  if (assignmentType === 'User') {
    if (!payload.user_id) {
      details.push({ field: 'user_id', message: 'User is required for User assignments' });
    }
    if (payload.department_id) {
      details.push({ field: 'department_id', message: 'Department must not be set for User assignments' });
    }
    if (payload.position_title) {
      details.push({ field: 'position_title', message: 'Position must not be set for User assignments' });
    }
  }

  if (details.length) {
    return { valid: false, message: 'Assignment validation failed', details };
  }

  return { valid: true, assignment_type: assignmentType };
}

module.exports = {
  ASSIGNMENT_TYPES,
  normalizeAssignmentType,
  validateAssignmentPayload,
};

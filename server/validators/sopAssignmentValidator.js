const ASSIGNMENT_TYPES = Object.freeze(['Department', 'Position', 'User', 'Mixed']);

function normalizeAssignmentType(value) {
  const raw = String(value || 'Mixed').trim();
  const map = {
    department: 'Department',
    position: 'Position',
    user: 'User',
    mixed: 'Mixed',
    Department: 'Department',
    Position: 'Position',
    User: 'User',
    Mixed: 'Mixed',
  };
  return map[raw] || raw;
}

function validateAssignmentPayload(payload) {
  const details = [];
  const department_ids = payload.department_ids || [];
  const position_names = payload.position_names || [];
  const user_ids = payload.user_ids || [];

  if (department_ids.length === 0 && position_names.length === 0 && user_ids.length === 0) {
    details.push({ field: '_root', message: 'At least one department, position, or user must be selected' });
  }

  if (department_ids.length > 0 && typeof department_ids[0] !== 'number') {
    details.push({ field: 'department_ids', message: 'department_ids must contain numeric department IDs' });
  }

  if (position_names.length > 0 && !position_names.every((p) => typeof p === 'string' && p.trim())) {
    details.push({ field: 'position_names', message: 'position_names must contain non-empty strings' });
  }

  if (user_ids.length > 0 && typeof user_ids[0] !== 'number') {
    details.push({ field: 'user_ids', message: 'user_ids must contain numeric user IDs' });
  }

  if (details.length) {
    return { valid: false, message: 'Assignment validation failed', details };
  }

  return { valid: true, department_ids, position_names, user_ids };
}

module.exports = { ASSIGNMENT_TYPES, normalizeAssignmentType, validateAssignmentPayload };

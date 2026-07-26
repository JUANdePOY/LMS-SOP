import { ASSIGNMENT_TYPE, ASSIGNMENT_TYPE_LIST } from '../constants/assignmentTypes';

function normalizeAssignmentType(value) {
  const raw = String(value || ASSIGNMENT_TYPE.USER).trim();
  const map = {
    department: ASSIGNMENT_TYPE.DEPARTMENT,
    position: ASSIGNMENT_TYPE.POSITION,
    user: ASSIGNMENT_TYPE.USER,
    Department: ASSIGNMENT_TYPE.DEPARTMENT,
    Position: ASSIGNMENT_TYPE.POSITION,
    User: ASSIGNMENT_TYPE.USER,
  };
  return map[raw] || raw;
}

export function validateAssignmentForm(values) {
  const errors = {};
  const assignmentType = normalizeAssignmentType(values.assignment_type);

  if (!ASSIGNMENT_TYPE_LIST.includes(assignmentType)) {
    errors.assignment_type = 'Select a valid assignment type';
    return errors;
  }

  if (assignmentType === ASSIGNMENT_TYPE.DEPARTMENT && !values.department_id) {
    errors.department_id = 'Department is required';
  }

  if (assignmentType === ASSIGNMENT_TYPE.POSITION && !String(values.position_title || '').trim()) {
    errors.position_title = 'Position title is required';
  }

  if (assignmentType === ASSIGNMENT_TYPE.USER && !values.user_id) {
    errors.user_id = 'User is required';
  }

  return errors;
}

export function buildAssignmentPayload(values) {
  const assignmentType = normalizeAssignmentType(values.assignment_type);
  const payload = { assignment_type: assignmentType };

  if (assignmentType === ASSIGNMENT_TYPE.DEPARTMENT) {
    payload.department_id = Number(values.department_id);
  } else if (assignmentType === ASSIGNMENT_TYPE.POSITION) {
    payload.position_title = String(values.position_title).trim();
  } else {
    payload.user_id = Number(values.user_id);
  }

  return payload;
}

export { normalizeAssignmentType };

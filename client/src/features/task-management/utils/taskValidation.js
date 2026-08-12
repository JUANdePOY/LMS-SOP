/**
 * Shared validation logic for task management.
 * Mirrors the backend validator in server/validators/taskValidator.js.
 */
import { TASK_PRIORITIES, TASK_STATUSES } from '../constants/taskConstants';

/**
 * Validate a task creation payload.
 * @param {object} payload - Task form data
 * @returns {{ valid: boolean, errors: object, errorFields: Set<string> }}
 */
export function validateTaskPayload(payload) {
  const errors = {};

  if (!payload.title || !payload.title.trim()) {
    errors.title = 'Title is required';
  } else if (payload.title.length > 255) {
    errors.title = 'Title must not exceed 255 characters';
  }

  if (!payload.start_datetime) {
    errors.start_datetime = 'Start date and time is required';
  }

  if (!payload.deadline_datetime) {
    errors.deadline_datetime = 'Deadline is required';
  } else if (payload.start_datetime && new Date(payload.deadline_datetime) <= new Date(payload.start_datetime)) {
    errors.deadline_datetime = 'Deadline must be after start date and time';
  }

  if (payload.priority && !TASK_PRIORITIES.includes(payload.priority)) {
    errors.priority = `Priority must be one of: ${TASK_PRIORITIES.join(', ')}`;
  }

  if (payload.status && !TASK_STATUSES.includes(payload.status)) {
    errors.status = `Status must be one of: ${TASK_STATUSES.join(', ')}`;
  }

  if (payload.estimated_hours !== '' && payload.estimated_hours !== null && payload.estimated_hours !== undefined) {
    const hours = Number(payload.estimated_hours);
    if (!Number.isFinite(hours) || hours < 0 || !Number.isInteger(hours)) {
      errors.estimated_hours = 'Estimated hours must be a non-negative whole number';
    }
  }

  const validAssignments = (payload.assignments || []).filter((a) => a.reference_id || a.reference_name);
  if (validAssignments.length === 0) {
    errors.assignments = 'At least one assignment is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    errorFields: new Set(Object.keys(errors)),
  };
}

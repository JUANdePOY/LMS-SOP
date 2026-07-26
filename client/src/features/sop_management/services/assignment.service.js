import {
  createAssignment as createAssignmentRequest,
  deleteAssignment as deleteAssignmentRequest,
  getAssignments as getAssignmentsRequest,
} from '../api/assignment.api';
import { buildAssignmentPayload, validateAssignmentForm } from '../validators/assignment.validator';

function unwrapList(response) {
  const payload = response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

function unwrapItem(response) {
  const payload = response?.data ?? response;
  return payload?.data ?? payload;
}

export async function fetchAssignments(sopId) {
  const response = await getAssignmentsRequest(sopId);
  return unwrapList(response);
}

export async function addAssignment(sopId, values) {
  const errors = validateAssignmentForm(values);
  if (Object.keys(errors).length) {
    const error = new Error('Assignment validation failed');
    error.validationErrors = errors;
    throw error;
  }

  const response = await createAssignmentRequest(sopId, buildAssignmentPayload(values));
  return unwrapItem(response);
}

export async function removeAssignment(assignmentId) {
  const response = await deleteAssignmentRequest(assignmentId);
  return unwrapItem(response);
}

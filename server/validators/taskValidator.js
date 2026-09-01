const { TASK_PRIORITIES, TASK_STATUSES } = require('../models/taskModel');
const { ASSIGNMENT_TYPES } = require('../models/taskAssignmentModel');

function validateTaskPayload(body, requireAll = true) {
  const errors = [];
  const value = {};

  if (requireAll || body.title !== undefined) {
    const title = String(body.title || '').trim();
    if (!title) {
      errors.push('Title is required');
    } else if (title.length > 255) {
      errors.push('Title must not exceed 255 characters');
    } else {
      value.title = title;
    }
  }

  if (body.description !== undefined) {
    value.description = body.description ? String(body.description).trim() : null;
  }

  if (body.priority !== undefined) {
    const priority = String(body.priority).charAt(0).toUpperCase() + String(body.priority).slice(1).toLowerCase();
    if (!TASK_PRIORITIES.includes(priority)) {
      errors.push(`Priority must be one of: ${TASK_PRIORITIES.join(', ')}`);
    } else {
      value.priority = priority;
    }
  }

  if (body.status !== undefined) {
    const status = String(body.status).replace(/\b\w/g, c => c.toUpperCase());
    if (!TASK_STATUSES.includes(status)) {
      errors.push(`Status must be one of: ${TASK_STATUSES.join(', ')}`);
    } else {
      value.status = status;
    }
  }

  if (body.start_datetime != null) {
    value.start_datetime = body.start_datetime;
  }

  if (body.deadline_datetime != null) {
    value.deadline_datetime = body.deadline_datetime;
  }

  if (body.estimated_hours !== undefined && body.estimated_hours !== null && body.estimated_hours !== '') {
    const hours = parseInt(body.estimated_hours, 10);
    if (!Number.isFinite(hours) || hours < 0) {
      errors.push('Estimated hours must be a non-negative integer');
    } else {
      value.estimated_hours = hours;
    }
  }

  if (body.category !== undefined) {
    value.category = body.category ? String(body.category).trim() : null;
  }

  const hasParent = body.parent_task_id !== undefined && body.parent_task_id !== null && body.parent_task_id !== '';

  // Sub-tasks inherit their parent's context, so they don't need their own
  // Client/Business linkage or explicit start/deadline dates. Top-level tasks
  // may also be created without dates so they can be filled in afterwards.
  const requiresDates = false;

  for (const key of ['parent_task_id', 'client_id', 'client_business_id', 'business_id', 'project_id']) {
    if (body[key] !== undefined) {
      if (body[key] === null || body[key] === '') {
        value[key] = null;
      } else {
        const intVal = parseInt(body[key], 10);
        if (!Number.isFinite(intVal) || intVal <= 0) {
          errors.push(`${key.replace(/_/g, ' ')} must be a positive integer`);
        } else {
          value[key] = intVal;
        }
      }
    }
  }

  if (requiresDates || body.start_datetime != null) {
    value.start_datetime = body.start_datetime;
  }

  if (requiresDates || body.deadline_datetime != null) {
    value.deadline_datetime = body.deadline_datetime;
  }

  // Main tasks (no parent) must be linked to a Client and Client Business.
  // The project layer has been removed from the table, so project_id is now
  // optional — a task can live directly under its client business unit.
  if (requireAll && !hasParent && !value.parent_task_id) {
    for (const key of ['client_id', 'client_business_id']) {
      if (value[key] === undefined || value[key] === null) {
        errors.push(`${key.replace(/_/g, ' ')} is required`);
      }
    }
  }

  return { valid: errors.length === 0, value, errors };
}

function validateAssignmentPayload(body) {
  const errors = [];
  const value = {};

  if (body.task_id !== undefined && body.task_id !== null && body.task_id !== '' && body.task_id !== 0) {
    const taskId = parseInt(body.task_id, 10);
    if (!Number.isFinite(taskId) || taskId <= 0) {
      errors.push('task_id must be a positive integer');
    } else {
      value.task_id = taskId;
    }
  }

  if (!body.assignment_type) {
    errors.push('assignment_type is required');
  } else {
    const type = String(body.assignment_type).charAt(0).toUpperCase() + String(body.assignment_type).slice(1).toLowerCase();
    if (!ASSIGNMENT_TYPES.includes(type)) {
      errors.push(`assignment_type must be one of: ${ASSIGNMENT_TYPES.join(', ')}`);
    } else {
      value.assignment_type = type;
    }
  }

  if (!body.reference_id && body.reference_id !== 0) {
    errors.push('reference_id is required');
  } else {
    value.reference_id = String(body.reference_id).trim();
  }

  return { valid: errors.length === 0, value, errors };
}

function validateProgressPayload(body) {
  const errors = [];
  const value = {};

  if (!body.task_id) {
    errors.push('task_id is required');
  } else {
    const taskId = parseInt(body.task_id, 10);
    if (!Number.isFinite(taskId) || taskId <= 0) {
      errors.push('task_id must be a positive integer');
    } else {
      value.task_id = taskId;
    }
  }

  if (body.completion_rate !== undefined && body.completion_rate !== null && body.completion_rate !== '') {
    const rate = parseInt(body.completion_rate, 10);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      errors.push('completion_rate must be between 0 and 100');
    } else {
      value.completion_rate = rate;
    }
  }

  if (body.status !== undefined) {
    const status = String(body.status).replace(/\b\w/g, c => c.toUpperCase());
    const { PROGRESS_STATUSES } = require('../models/taskProgressModel');
    if (!PROGRESS_STATUSES.includes(status)) {
      errors.push(`status must be one of: ${PROGRESS_STATUSES.join(', ')}`);
    } else {
      value.status = status;
    }
  }

  if (body.notes !== undefined) {
    value.notes = body.notes ? String(body.notes).trim() : null;
  }

  return { valid: errors.length === 0, value, errors };
}

function validateCommentPayload(body) {
  const errors = [];
  const value = {};

  if (!body.task_id) {
    errors.push('task_id is required');
  } else {
    const taskId = parseInt(body.task_id, 10);
    if (!Number.isFinite(taskId) || taskId <= 0) {
      errors.push('task_id must be a positive integer');
    } else {
      value.task_id = taskId;
    }
  }

  if (body.comment !== undefined && body.comment !== null) {
    const comment = String(body.comment).trim();
    if (comment.length > 5000) {
      errors.push('comment must not exceed 5000 characters');
    } else {
      value.comment = comment;
    }
  }

  if (body.parent_id !== undefined) {
    if (body.parent_id === '' || body.parent_id === null) {
      value.parent_id = null;
    } else {
      const parentId = parseInt(body.parent_id, 10);
      if (!Number.isFinite(parentId) || parentId <= 0) {
        errors.push('parent_id must be a positive integer');
      } else {
        value.parent_id = parentId;
      }
    }
  }

  if (body.mentions !== undefined) {
    const mentions = Array.isArray(body.mentions) ? body.mentions : [];
    const clean = [];
    for (const m of mentions) {
      if (m && Number.isFinite(Number(m.id)) && m.name) {
        clean.push({ id: Number(m.id), name: String(m.name) });
      }
    }
    value.mentions = clean;
  }

  return { valid: errors.length === 0, value, errors };
}

function validateBatchIds(body) {
  const errors = [];
  const value = { ids: [] };

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    errors.push('ids must be a non-empty array of task IDs');
  } else {
    const ids = [];
    for (const raw of body.ids) {
      const id = parseInt(raw, 10);
      if (!Number.isFinite(id) || id <= 0) {
        errors.push('All task IDs must be positive integers');
        break;
      }
      ids.push(id);
    }
    if (ids.length > 500) {
      errors.push('You can operate on at most 500 tasks at once');
    } else {
      value.ids = ids;
    }
  }

  return { valid: errors.length === 0, value, errors };
}

function validateBatchUpdatePayload(body) {
  const errors = [];
  const value = { ids: [], changes: {} };

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    errors.push('ids must be a non-empty array of task IDs');
  } else {
    const ids = [];
    for (const raw of body.ids) {
      const id = parseInt(raw, 10);
      if (!Number.isFinite(id) || id <= 0) {
        errors.push('All task IDs must be positive integers');
        break;
      }
      ids.push(id);
    }
    if (ids.length > 500) {
      errors.push('You can update at most 500 tasks at once');
    } else {
      value.ids = ids;
    }
  }

  const changes = body.changes || {};
  if (changes.status !== undefined) {
    const status = String(changes.status).replace(/\b\w/g, c => c.toUpperCase());
    if (!TASK_STATUSES.includes(status)) {
      errors.push(`Status must be one of: ${TASK_STATUSES.join(', ')}`);
    } else {
      value.changes.status = status;
    }
  }

  if (changes.priority !== undefined) {
    const priority = String(changes.priority).charAt(0).toUpperCase() + String(changes.priority).slice(1).toLowerCase();
    if (!TASK_PRIORITIES.includes(priority)) {
      errors.push(`Priority must be one of: ${TASK_PRIORITIES.join(', ')}`);
    } else {
      value.changes.priority = priority;
    }
  }

  for (const key of ['project_id', 'client_id', 'client_business_id', 'business_id']) {
    if (changes[key] !== undefined && changes[key] !== null && changes[key] !== '') {
      const intVal = parseInt(changes[key], 10);
      if (!Number.isFinite(intVal) || intVal <= 0) {
        errors.push(`${key.replace(/_/g, ' ')} must be a positive integer`);
      } else {
        value.changes[key] = intVal;
      }
    }
  }

  if (changes.assignments !== undefined) {
    if (!Array.isArray(changes.assignments)) {
      errors.push('assignments must be an array');
    } else {
      const validated = [];
      for (const a of changes.assignments) {
        const v = validateAssignmentPayload({ ...a, task_id: 0 });
        if (!v.valid) {
          errors.push(`Invalid assignment: ${v.errors.join(', ')}`);
          break;
        }
        validated.push(v.value);
      }
      if (errors.length === 0) value.changes.assignments = validated;
    }
  }

  if (Object.keys(value.changes).length === 0) {
    errors.push('changes must contain at least one field to update');
  }

  return { valid: errors.length === 0, value, errors };
}

function validateFilters(query) {
  const filters = {};
  const errors = [];

  if (query.status && query.status !== 'all') {
    filters.status = query.status;
  }

  if (query.priority && query.priority !== 'all') {
    filters.priority = query.priority;
  }

  if (query.category) {
    filters.category = query.category;
  }

  if (query.search) {
    filters.search = String(query.search).trim();
  }

  if (query.project_id) {
    const pid = parseInt(query.project_id, 10);
    if (Number.isFinite(pid) && pid > 0) {
      filters.project_id = pid;
    }
  }

  const page = parseInt(query.page, 10);
  if (!Number.isFinite(page) || page < 1) {
    filters.page = 1;
  } else {
    filters.page = page;
  }

  const limit = parseInt(query.limit, 10);
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    filters.limit = 20;
  } else {
    filters.limit = limit;
  }

  return { valid: errors.length === 0, value: filters, errors };
}

module.exports = {
  validateTaskPayload,
  validateAssignmentPayload,
  validateProgressPayload,
  validateCommentPayload,
  validateFilters,
  validateBatchIds,
  validateBatchUpdatePayload,
};

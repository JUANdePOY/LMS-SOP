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

  if (requireAll || body.start_datetime !== undefined) {
    if (!body.start_datetime) {
      errors.push('Start date and time is required');
    } else {
      value.start_datetime = body.start_datetime;
    }
  }

  if (requireAll || body.deadline_datetime !== undefined) {
    if (!body.deadline_datetime) {
      errors.push('Deadline is required');
    } else {
      value.deadline_datetime = body.deadline_datetime;
    }
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

  return { valid: errors.length === 0, value, errors };
}

function validateAssignmentPayload(body) {
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

  if (!body.comment) {
    errors.push('comment is required');
  } else {
    const comment = String(body.comment).trim();
    if (comment.length === 0) {
      errors.push('comment cannot be empty');
    } else if (comment.length > 5000) {
      errors.push('comment must not exceed 5000 characters');
    } else {
      value.comment = comment;
    }
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
};

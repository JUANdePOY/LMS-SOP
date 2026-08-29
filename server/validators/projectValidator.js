const {
  PROJECT_STATUSES,
  PROJECT_VIEW_TYPES,
  FIELD_TYPES,
} = require('../models/projectModel');

function validateProjectPayload(body, requireAll = true) {
  const errors = [];
  const value = {};

  if (requireAll || body.client_business_id !== undefined) {
    const cbId = parseInt(body.client_business_id, 10);
    if (!Number.isFinite(cbId) || cbId <= 0) {
      errors.push('client_business_id is required and must be a positive integer');
    } else {
      value.client_business_id = cbId;
    }
  }

  if (requireAll || body.name !== undefined) {
    const name = body.name != null ? String(body.name).trim() : '';
    if (!name) {
      errors.push('Project name is required');
    } else if (name.length > 255) {
      errors.push('Project name must not exceed 255 characters');
    } else {
      value.name = name;
    }
  }

  if (body.description !== undefined) {
    value.description = body.description ? String(body.description).trim() : null;
  }

  if (body.status !== undefined) {
    const status = String(body.status).toLowerCase();
    if (!PROJECT_STATUSES.includes(status)) {
      errors.push(`Status must be one of: ${PROJECT_STATUSES.join(', ')}`);
    } else {
      value.status = status;
    }
  }

  if (body.color !== undefined) {
    value.color = body.color ? String(body.color).trim() : '#C14E08';
  }

  if (body.start_date !== undefined) {
    value.start_date = body.start_date ? String(body.start_date) : null;
  }

  if (body.due_date !== undefined) {
    value.due_date = body.due_date ? String(body.due_date) : null;
  }

  if (body.enabled_views !== undefined) {
    if (Array.isArray(body.enabled_views)) {
      value.enabled_views = body.enabled_views.filter((v) => PROJECT_VIEW_TYPES.includes(v));
    } else if (typeof body.enabled_views === 'string') {
      value.enabled_views = body.enabled_views
        .split(',').map((s) => s.trim()).filter((v) => PROJECT_VIEW_TYPES.includes(v));
    }
  }

  return { valid: errors.length === 0, value, errors };
}

function validateFieldDefPayload(body) {
  const errors = [];
  const value = {};

  const name = body.name != null ? String(body.name).trim() : '';
  if (!name) {
    errors.push('Field name is required');
  } else if (name.length > 255) {
    errors.push('Field name must not exceed 255 characters');
  } else {
    value.name = name;
  }

  const type = body.type != null ? String(body.type).toLowerCase() : 'text';
  if (!FIELD_TYPES.includes(type)) {
    errors.push(`Field type must be one of: ${FIELD_TYPES.join(', ')}`);
  } else {
    value.type = type;
  }

  if (body.options !== undefined && body.options !== null) {
    const opts = Array.isArray(body.options) ? body.options : [body.options];
    value.options = opts.map((o) => String(o).trim()).filter(Boolean);
  }

  if (body.position !== undefined) {
    const pos = parseInt(body.position, 10);
    value.position = Number.isFinite(pos) && pos >= 0 ? pos : 0;
  }

  return { valid: errors.length === 0, value, errors };
}

module.exports = { validateProjectPayload, validateFieldDefPayload };

const { CERTIFICATE_SECTIONS, normalizeSections } = require('../shared/certificateSections');

function validateTemplatePayload(body, options = {}) {
  const errors = [];
  const value = {};

  const name = (body.name || '').trim();
  if (!name) {
    errors.push('Template name is required');
  } else if (name.length > 150) {
    errors.push('Template name must be 150 characters or fewer');
  } else {
    value.name = name;
  }

  const orientation = (body.orientation || 'landscape').trim();
  if (orientation !== 'landscape' && orientation !== 'portrait') {
    errors.push('Orientation must be landscape or portrait');
  } else {
    value.orientation = orientation;
  }

  const widthPx = body.width_px !== undefined && body.width_px !== null && body.width_px !== ''
    ? parseInt(body.width_px, 10)
    : null;
  if (!options.isCreate && widthPx === null) {
    // width_px is optional for updates
  } else if (!widthPx || widthPx <= 0) {
    errors.push('width_px must be a positive integer');
  } else {
    value.width_px = widthPx;
  }

  const heightPx = body.height_px !== undefined && body.height_px !== null && body.height_px !== ''
    ? parseInt(body.height_px, 10)
    : null;
  if (!options.isCreate && heightPx === null) {
    // height_px is optional for updates
  } else if (!heightPx || heightPx <= 0) {
    errors.push('height_px must be a positive integer');
  } else {
    value.height_px = heightPx;
  }

  const status = (body.status || 'draft').trim();
  if (!['draft', 'active', 'archived'].includes(status)) {
    errors.push('Status must be draft, active, or archived');
  } else {
    value.status = status;
  }

  if (body.department_id !== undefined && body.department_id !== null && body.department_id !== '') {
    const deptId = parseInt(body.department_id, 10);
    if (!Number.isFinite(deptId) || deptId <= 0) {
      errors.push('department_id must be a positive integer');
    } else {
      value.department_id = deptId;
    }
  } else if (!options.isCreate) {
    value.department_id = null;
  }

  return { valid: errors.length === 0, value, errors };
}

function validateSectionsPayload(rawSections) {
  const errors = [];

  if (!rawSections) {
    return { valid: false, value: {}, errors: ['sections is required'] };
  }

  let parsed = rawSections;
  if (typeof rawSections === 'string') {
    try {
      parsed = JSON.parse(rawSections);
    } catch {
      return { valid: false, value: {}, errors: ['sections must be valid JSON'] };
    }
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, value: parsed, errors: ['sections must be a JSON object'] };
  }

  const sectionKeys = CERTIFICATE_SECTIONS.map(s => s.key);
  for (const key of sectionKeys) {
    if (!Object.prototype.hasOwnProperty.call(parsed, key)) {
      errors.push(`Missing section: ${key}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, value: parsed, errors };
  }

  const normalized = normalizeSections(parsed);
  for (const section of CERTIFICATE_SECTIONS) {
    const data = normalized[section.key];
    if (typeof data.text !== 'string') {
      errors.push(`Section ${section.key}: text must be a string`);
    }
    if (typeof data.font_size !== 'number' || data.font_size <= 0) {
      errors.push(`Section ${section.key}: font_size must be a positive number`);
    }
    if (typeof data.line_height !== 'number' || data.line_height <= 0 || data.line_height > 5) {
      errors.push(`Section ${section.key}: line_height must be a positive number (e.g. 1.0 - 3.0)`);
    }
    if (!['normal', 'bold'].includes(data.font_weight)) {
      errors.push(`Section ${section.key}: font_weight must be normal or bold`);
    }
    if (!['normal', 'italic'].includes(data.font_style)) {
      errors.push(`Section ${section.key}: font_style must be normal or italic`);
    }
    if (section.key === 'signatures_seal' && !Array.isArray(data.items)) {
      errors.push('Section signatures_seal: items must be an array');
    }
  }

  return { valid: errors.length === 0, value: normalized, errors };
}

module.exports = {
  validateTemplatePayload,
  validateSectionsPayload,
};

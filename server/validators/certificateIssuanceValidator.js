function validateIssuancePayload(body) {
  const errors = [];
  const value = {};

  const templateId = parseInt(body.template_id, 10);
  if (!Number.isFinite(templateId) || templateId <= 0) {
    errors.push('template_id must be a positive integer');
  } else {
    value.template_id = templateId;
  }

  const userId = parseInt(body.user_id, 10);
  if (!Number.isFinite(userId) || userId <= 0) {
    errors.push('user_id must be a positive integer');
  } else {
    value.user_id = userId;
  }

  if (body.overrides !== undefined && body.overrides !== null) {
    if (typeof body.overrides !== 'object' || Array.isArray(body.overrides)) {
      errors.push('overrides must be an object');
    } else {
      value.overrides = body.overrides;
    }
  }

  return { valid: errors.length === 0, value, errors };
}

module.exports = {
  validateIssuancePayload,
};

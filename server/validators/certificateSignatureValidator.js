function validateSignaturePayload(body) {
  const errors = [];
  const value = {};

  const label = (body.label || '').trim();
  if (!label) {
    errors.push('Label is required');
  } else if (label.length > 150) {
    errors.push('Label must be 150 characters or fewer');
  } else {
    value.label = label;
  }

  const type = (body.type || 'signature').trim();
  if (!['signature', 'seal'].includes(type)) {
    errors.push('Type must be signature or seal');
  } else {
    value.type = type;
  }

  if (body.is_default !== undefined && body.is_default !== null && body.is_default !== '') {
    value.is_default = body.is_default ? 1 : 0;
  }

  if (body.user_id !== undefined && body.user_id !== null && body.user_id !== '') {
    const userId = parseInt(body.user_id, 10);
    if (!Number.isFinite(userId) || userId <= 0) {
      errors.push('user_id must be a positive integer');
    } else {
      value.user_id = userId;
    }
  }

  return { valid: errors.length === 0, value, errors };
}

module.exports = {
  validateSignaturePayload,
};

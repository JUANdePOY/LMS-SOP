const SHARE_TYPES = Object.freeze(['public', 'private']);
const PERMISSIONS = Object.freeze(['view', 'download']);

function validateShareLinkPayload(payload) {
  const details = [];

  if (!payload.share_type || !SHARE_TYPES.includes(payload.share_type)) {
    details.push({ field: 'share_type', message: `share_type must be one of: ${SHARE_TYPES.join(', ')}` });
  }

  if (payload.permissions && !PERMISSIONS.includes(payload.permissions)) {
    details.push({ field: 'permissions', message: `permissions must be one of: ${PERMISSIONS.join(', ')}` });
  }

  if (payload.expires_at !== undefined && payload.expires_at !== null) {
    const date = new Date(payload.expires_at);
    if (isNaN(date.getTime())) {
      details.push({ field: 'expires_at', message: 'expires_at must be a valid ISO 8601 date' });
    } else if (date <= new Date()) {
      details.push({ field: 'expires_at', message: 'expires_at must be a future date' });
    }
  }

  if (details.length) {
    return { valid: false, message: 'Share link validation failed', details };
  }

  return {
    valid: true,
    share_type: payload.share_type,
    permissions: payload.permissions || 'view',
    expires_at: payload.expires_at || null,
  };
}

module.exports = { SHARE_TYPES, PERMISSIONS, validateShareLinkPayload };

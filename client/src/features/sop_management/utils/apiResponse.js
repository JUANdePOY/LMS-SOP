// Success stays enveloped ({ success, data, meta }) — the interceptor in the existing api.js
// only inspects the REJECTED (error) branch, so this doesn't touch anything that already works.
//
// Error is now FLAT to match the existing interceptor's expectation:
//   const code = error.response?.data?.code;
// i.e. `code` and `message` must sit directly on the response body, not nested under `error`.
// This keeps the 401/403 auto-logout redirect working for every SOP route without touching
// api.js or retesting existing auth/users/departments/roles/settings endpoints.

export function sendSuccess(res, data, meta = null, statusCode = 200) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function sendError(res, code, message, details = null, statusCode = 400) {
  const body = { code, message };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

export const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  NO_TOKEN: 'NO_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
});
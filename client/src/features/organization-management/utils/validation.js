const ID_RE = /^\d+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s()+\-]{7,30}$/;

export function validateId(id, label = 'ID') {
  if (id === null || id === undefined || id === '') {
    return `${label} is required`;
  }
  if (!ID_RE.test(String(id))) {
    return `${label} must be a positive integer`;
  }
  return null;
}

export function validateRequired(value, label) {
  if (value === null || value === undefined || value === '') {
    return `${label} is required`;
  }
  return null;
}

export function validateString(value, label, { minLength = 1, maxLength = 255 } = {}) {
  const err = validateRequired(value, label);
  if (err) return err;
  const str = String(value).trim();
  if (str.length < minLength) return `${label} must be at least ${minLength} character(s)`;
  if (str.length > maxLength) return `${label} must be at most ${maxLength} character(s)`;
  return null;
}

export function validateEmail(email) {
  const err = validateRequired(email, 'Email');
  if (err) return err;
  if (!EMAIL_RE.test(String(email).trim())) return 'Enter a valid email address';
  return null;
}

export function validatePhone(phone) {
  if (!phone || !String(phone).trim()) return null;
  if (!PHONE_RE.test(String(phone))) return 'Enter a valid phone number';
  return null;
}

export function validateFile(file, { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] } = {}) {
  if (!file) return null;
  if (!allowedTypes.includes(file.type)) {
    return `File type must be one of: ${allowedTypes.join(', ')}`;
  }
  if (file.size > maxSize) {
    return `File must be smaller than ${maxSize / 1024 / 1024}MB`;
  }
  return null;
}

export function validatePagination(params = {}) {
  const page = parseInt(params.page, 10);
  const limit = parseInt(params.limit, 10);
  const errors = {};
  if (isNaN(page) || page < 1) errors.page = 'Page must be a positive integer';
  if (isNaN(limit) || limit < 1 || limit > 100) errors.limit = 'Limit must be between 1 and 100';
  return { valid: Object.keys(errors).length === 0, errors, sanitized: { page: page || 1, limit: limit || 50 } };
}

export function validateSearchQuery(query) {
  if (!query || !String(query).trim()) return null;
  const str = String(query).trim();
  if (str.length > 100) return 'Search query must be at most 100 characters';
  if (/[<>]/.test(str)) return 'Search query contains invalid characters';
  return null;
}

export function sanitizeSearchQuery(query) {
  if (!query) return '';
  return String(query).trim().slice(0, 100);
}

export function validateBusinessData(data) {
  const errors = {};
  const codeErr = validateString(data.business_code, 'Business code', { maxLength: 20 });
  if (codeErr) errors.business_code = codeErr;
  const nameErr = validateString(data.business_name, 'Business name', { maxLength: 150 });
  if (nameErr) errors.business_name = nameErr;
  if (data.email && !EMAIL_RE.test(String(data.email).trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (data.phone && !PHONE_RE.test(String(data.phone))) {
    errors.phone = 'Enter a valid phone number';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateCategoryData(data) {
  const errors = {};
  const nameErr = validateString(data.name, 'Category name', { maxLength: 100 });
  if (nameErr) errors.name = nameErr;
  if (!data.department_id) errors.department_id = 'Department is required';
  if (data.description && String(data.description).length > 500) {
    errors.description = 'Description must be at most 500 characters';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateDepartmentData(data) {
  const errors = {};
  const nameErr = validateString(data.name, 'Department name', { maxLength: 100 });
  if (nameErr) errors.name = nameErr;
  const codeErr = validateString(data.code, 'Department code', { maxLength: 20 });
  if (codeErr) errors.code = codeErr;
  if (!data.business_id) errors.business_id = 'Business is required';
  if (data.head_user_id !== null && data.head_user_id !== undefined && !ID_RE.test(String(data.head_user_id))) {
    errors.head_user_id = 'Department head must be a valid user ID';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

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

  if (body.course_id !== undefined && body.course_id !== null && body.course_id !== '') {
    const courseId = parseInt(body.course_id, 10);
    if (!Number.isFinite(courseId) || courseId <= 0) {
      errors.push('course_id must be a positive integer');
    } else {
      value.course_id = courseId;
    }
  }

  if (body.enrollment_id !== undefined && body.enrollment_id !== null && body.enrollment_id !== '') {
    const enrollmentId = parseInt(body.enrollment_id, 10);
    if (!Number.isFinite(enrollmentId) || enrollmentId <= 0) {
      errors.push('enrollment_id must be a positive integer');
    } else {
      value.enrollment_id = enrollmentId;
    }
  }

  if (body.verification_code !== undefined && body.verification_code !== null && body.verification_code !== '') {
    const code = String(body.verification_code).trim();
    if (code.length > 255) {
      errors.push('verification_code must be at most 255 characters');
    } else if (!/^[A-Za-z0-9\-]+$/.test(code)) {
      errors.push('verification_code must contain only alphanumeric characters and hyphens');
    } else {
      value.verification_code = code;
    }
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

export const validateSopDraft = (values = {}) => {
  const errors = {};
  if (!values.title || String(values.title).trim().length < 2) {
    errors.title = 'Title is required';
  }
  if (!values.department_id) {
    errors.department_id = 'Department is required';
  }
  // category_id is nullable in database (DEFAULT NULL)
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

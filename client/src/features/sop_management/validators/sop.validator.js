export const validateSopDraft = (values = {}) => {
  const errors = {};
  if (!values.title || String(values.title).trim().length < 2) {
    errors.title = 'Title is required';
  }
  if (!values.department_id) {
    errors.department_id = 'Department is required';
  }
  if (!values.category_id) {
    errors.category_id = 'Category is required';
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

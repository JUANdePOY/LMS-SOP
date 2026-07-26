export const validateSection = (values = {}) => {
  const errors = {};
  if (!values.title || String(values.title).trim().length < 2) {
    errors.title = 'Section title is required';
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

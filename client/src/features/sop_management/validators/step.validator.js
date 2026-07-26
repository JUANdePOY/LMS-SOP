export const validateStep = (values = {}) => {
  const errors = {};
  if (!values.title || String(values.title).trim().length < 2) {
    errors.title = 'Step title is required';
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

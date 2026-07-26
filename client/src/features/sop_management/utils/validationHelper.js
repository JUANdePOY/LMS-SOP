export const toQueryParams = (params = {}) => {
  const clean = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  const search = new URLSearchParams(clean);
  return search.toString();
};

export const normalizeStatus = (status) => status || 'Draft';

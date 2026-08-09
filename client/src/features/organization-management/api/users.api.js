import api from '../../../lib/api';
import { validatePagination, sanitizeSearchQuery } from '../utils/validation';

export const getUsers = (params = {}) => {
  const { sanitized } = validatePagination(params);
  const query = params.query ? sanitizeSearchQuery(params.query) : '';
  return api.get('/users', { params: { ...params, ...sanitized, query } });
};

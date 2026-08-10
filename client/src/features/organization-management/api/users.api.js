import api from '../../../lib/api';
import { validatePagination, sanitizeSearchQuery } from '../utils/validation';

export const getUsers = (params = {}) => {
  const { sanitized } = validatePagination(params);
  const search = params.query ? sanitizeSearchQuery(params.query) : '';
  return api.get('/users', { params: { ...sanitized, search, ...params } });
};

import api from '../../../lib/api';
import { validateId } from '../../organization-management/utils/validation';

export const getOrganizationHierarchy = () => api.get('/hierarchy');

export const getDepartmentSops = (departmentId, categoryId) => {
  const err = validateId(departmentId, 'Department ID');
  if (err) return Promise.reject(new Error(err));
  const params = { department_id: departmentId, include_assigned: true };
  if (categoryId) {
    const catErr = validateId(categoryId, 'Category ID');
    if (catErr) return Promise.reject(new Error(catErr));
    params.category_id = categoryId;
  } else {
    params.exclude_categorized = true;
  }
  return api.get('/sops', { params });
};

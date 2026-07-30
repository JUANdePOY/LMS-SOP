import api from '../../../lib/api';
import { validateId } from '../../organization-management/utils/validation';

export const getOrganizationHierarchy = () => api.get('/hierarchy');

export const getDepartmentSops = (departmentId) => {
  const err = validateId(departmentId, 'Department ID');
  if (err) return Promise.reject(new Error(err));
  return api.get('/sops', { params: { department_id: departmentId } });
};

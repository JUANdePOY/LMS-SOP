import { getBusinesses, getBusiness, createBusiness, updateBusiness, deleteBusiness, getBusinessHierarchy } from '../api/business.api';

export const businessService = {
  list: (params) => getBusinesses(params).then((r) => r.data),
  get: (id) => getBusiness(id).then((r) => r.data?.data || r.data),
  create: (data) => createBusiness(data).then((r) => r.data),
  update: (id, data) => updateBusiness(id, data).then((r) => r.data),
  delete: (id) => deleteBusiness(id).then((r) => r.data),
  hierarchy: () => getBusinessHierarchy().then((r) => r.data?.data || []),
};

export default businessService;


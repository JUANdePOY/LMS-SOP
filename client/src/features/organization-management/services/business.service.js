import { getBusinesses, getBusiness, createBusiness, updateBusiness, deleteBusiness, getBusinessHierarchy } from '../api/business.api';

function isValidResponse(payload) {
  return payload !== null && payload !== undefined;
}

export const businessService = {
  list: (params) =>
    getBusinesses(params)
      .then((r) => {
        const data = r.data;
        if (!isValidResponse(data)) return [];
        return data.data?.rows || data.data || [];
      })
      .catch((err) => {
        throw new Error(err?.response?.data?.message || err?.message || 'Unable to load businesses');
      }),
  get: (id) =>
    getBusiness(id)
      .then((r) => {
        const data = r.data;
        if (!isValidResponse(data)) throw new Error('Invalid response');
        return data.data || data;
      })
      .catch((err) => {
        throw new Error(err?.response?.data?.message || err?.message || 'Unable to load business');
      }),
  create: (data) =>
    createBusiness(data)
      .then((r) => {
        const payload = r.data;
        if (!isValidResponse(payload)) throw new Error('Invalid response');
        return payload.data || payload;
      })
      .catch((err) => {
        throw new Error(err?.response?.data?.message || err?.message || 'Failed to create business');
      }),
  update: (id, data) =>
    updateBusiness(id, data)
      .then((r) => {
        const payload = r.data;
        if (!isValidResponse(payload)) throw new Error('Invalid response');
        return payload.data || payload;
      })
      .catch((err) => {
        throw new Error(err?.response?.data?.message || err?.message || 'Failed to update business');
      }),
  delete: (id) =>
    deleteBusiness(id)
      .then((r) => r.data)
      .catch((err) => {
        throw new Error(err?.response?.data?.message || err?.message || 'Failed to delete business');
      }),
  hierarchy: () =>
    getBusinessHierarchy()
      .then((r) => {
        const data = r.data;
        if (!isValidResponse(data)) return [];
        return data.data || [];
      })
      .catch((err) => {
        throw new Error(err?.response?.data?.message || err?.message || 'Unable to load hierarchy');
      }),
};

export default businessService;


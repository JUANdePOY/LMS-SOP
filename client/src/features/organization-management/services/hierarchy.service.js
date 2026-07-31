import { getOrganizationHierarchy } from '../api/hierarchy.api';

function isValidResponse(payload) {
  return payload !== null && payload !== undefined;
}

export const hierarchyService = {
  get: () =>
    getOrganizationHierarchy()
      .then((r) => {
        const data = r.data;
        if (!isValidResponse(data)) return [];
        return data.data || [];
      })
      .catch((err) => {
        throw new Error(err?.response?.data?.message || err?.message || 'Unable to load hierarchy');
      }),
};

export default hierarchyService;


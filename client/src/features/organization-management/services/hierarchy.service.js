import { getOrganizationHierarchy } from '../api/hierarchy.api';

export const hierarchyService = {
  get: () => getOrganizationHierarchy().then((r) => r.data?.data || []),
};

export default hierarchyService;


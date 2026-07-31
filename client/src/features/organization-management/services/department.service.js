import { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment, getDepartmentTree } from '../api/department.api';

function isValidResponse(payload) {
  return payload !== null && payload !== undefined;
}

export const departmentService = {
  list: (params) =>
    getDepartments(params)
      .then((r) => {
        const data = r.data;
        if (!isValidResponse(data)) return [];
        return data.data?.rows || data.data || [];
      })
      .catch((err) => {
        throw new Error(err?.response?.data?.message || err?.message || 'Unable to load departments');
      }),
  get: (id) =>
    getDepartment(id)
      .then((r) => {
        const data = r.data;
        if (!isValidResponse(data)) throw new Error('Invalid response');
        return data.data || data;
      })
      .catch((err) => {
        throw new Error(err?.response?.data?.message || err?.message || 'Unable to load department');
      }),
  create: (data) =>
    createDepartment(data)
      .then((r) => {
        const payload = r.data;
        if (!isValidResponse(payload)) throw new Error('Invalid response');
        return payload.data || payload;
      })
      .catch((err) => {
        throw new Error(err?.response?.data?.message || err?.message || 'Failed to create department');
      }),
  update: (id, data) =>
    updateDepartment(id, data)
      .then((r) => {
        const payload = r.data;
        if (!isValidResponse(payload)) throw new Error('Invalid response');
        return payload.data || payload;
      })
      .catch((err) => {
        throw new Error(err?.response?.data?.message || err?.message || 'Failed to update department');
      }),
  delete: (id) =>
    deleteDepartment(id)
      .then((r) => r.data)
      .catch((err) => {
        throw new Error(err?.response?.data?.message || err?.message || 'Failed to delete department');
      }),
  tree: () =>
    getDepartmentTree()
      .then((r) => {
        const data = r.data;
        if (!isValidResponse(data)) return [];
        return data.data || [];
      })
      .catch((err) => {
        throw new Error(err?.response?.data?.message || err?.message || 'Unable to load department tree');
      }),
};

export default departmentService;


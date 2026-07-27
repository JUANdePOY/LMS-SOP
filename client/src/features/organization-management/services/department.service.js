import { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment, getDepartmentTree } from '../api/department.api';

export const departmentService = {
  list: (params) => getDepartments(params).then((r) => r.data),
  get: (id) => getDepartment(id).then((r) => r.data?.data || r.data),
  create: (data) => createDepartment(data).then((r) => r.data),
  update: (id, data) => updateDepartment(id, data).then((r) => r.data),
  delete: (id) => deleteDepartment(id).then((r) => r.data),
  tree: () => getDepartmentTree().then((r) => r.data?.data || []),
};

export default departmentService;


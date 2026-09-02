import api from '@/services/api';

function unwrap(res) {
  const payload = res?.data;
  if (!payload || payload.success === false) {
    throw new Error(payload?.message || 'Request failed');
  }
  return payload.data;
}

export async function getProjectTree() {
  const res = await api.get('/projects/tree');
  return unwrap(res);
}

export async function getBusinessProjects(businessId) {
  const res = await api.get(`/businesses/${businessId}/projects`);
  return unwrap(res);
}

export async function getProjects(params = {}) {
  const res = await api.get('/projects', { params });
  return unwrap(res);
}

export async function getProject(id) {
  const res = await api.get(`/projects/${id}`);
  return unwrap(res);
}

export async function createProject(payload) {
  const res = await api.post('/projects', payload);
  return unwrap(res);
}

export async function updateProject(id, payload) {
  const res = await api.put(`/projects/${id}`, payload);
  return unwrap(res);
}

export async function deleteProject(id) {
  const numId = Number(id);
  if (!Number.isFinite(numId) || numId <= 0) {
    throw new Error(`Invalid project ID: ${id}`);
  }
  const res = await api.delete(`/projects/${numId}`);
  return unwrap(res);
}

export async function getProjectFields(projectId) {
  const res = await api.get(`/projects/${projectId}/fields`);
  return unwrap(res);
}

export async function createProjectField(projectId, payload) {
  const res = await api.post(`/projects/${projectId}/fields`, payload);
  return unwrap(res);
}

export async function updateProjectField(projectId, fieldId, payload) {
  const res = await api.put(`/projects/${projectId}/fields/${fieldId}`, payload);
  return unwrap(res);
}

export async function deleteProjectField(projectId, fieldId) {
  const res = await api.delete(`/projects/${projectId}/fields/${fieldId}`);
  return unwrap(res);
}

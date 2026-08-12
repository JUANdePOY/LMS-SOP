import api from '@/services/api';

const API_BASE = '/tasks';

function ensureSuccess(res, fallbackMessage) {
  const payload = res?.data;
  if (!payload || payload.success === false) {
    throw new Error(payload?.message || fallbackMessage || 'Request failed');
  }
  return payload;
}

export async function getTasks(params = {}) {
  const res = await api.get(API_BASE, { params });
  return ensureSuccess(res, 'Failed to load tasks').data;
}

export async function getTask(id) {
  const res = await api.get(`${API_BASE}/${id}`);
  return ensureSuccess(res, 'Failed to load task').data;
}

export async function createTask(payload) {
  const res = await api.post(API_BASE, payload);
  return ensureSuccess(res, 'Failed to create task').data;
}

export async function updateTask(id, payload) {
  const res = await api.put(`${API_BASE}/${id}`, payload);
  return ensureSuccess(res, 'Failed to update task').data;
}

export async function deleteTask(id) {
  const res = await api.delete(`${API_BASE}/${id}`);
  return ensureSuccess(res, 'Failed to delete task').data;
}

export async function assignTask(payload) {
  const res = await api.post(`${API_BASE}/assign`, payload);
  return ensureSuccess(res, 'Failed to assign task').data;
}

export async function updateProgress(payload) {
  const res = await api.post(`${API_BASE}/progress`, payload);
  return ensureSuccess(res, 'Failed to update progress').data;
}

export async function addComment(payload) {
  const res = await api.post(`${API_BASE}/${payload.task_id}/comments`, { comment: payload.comment });
  return ensureSuccess(res, 'Failed to add comment').data;
}

export async function uploadAttachment(taskId, formData) {
  const res = await api.post(`${API_BASE}/${taskId}/attachments`, formData, {
    skipAuthRedirect: true,
  });
  return ensureSuccess(res, 'Failed to upload attachment').data;
}

export async function deleteAttachment(taskId, attachmentId) {
  const res = await api.delete(`${API_BASE}/${taskId}/attachments/${attachmentId}`);
  return ensureSuccess(res, 'Failed to delete attachment').data;
}

export async function getMyTasks(params = {}) {
  const res = await api.get(`${API_BASE}/my`, { params });
  return ensureSuccess(res, 'Failed to load my tasks').data;
}

export async function getMyTaskCount() {
  const res = await api.get(`${API_BASE}/my/count`);
  return ensureSuccess(res, 'Failed to load task count').data;
}

export async function getTaskStats() {
  const res = await api.get(`${API_BASE}/stats`);
  return ensureSuccess(res, 'Failed to load task stats').data;
}

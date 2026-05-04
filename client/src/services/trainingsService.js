/**
 * Trainings Service
 * API calls for trainings CRUD operations
 */

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export async function getTrainings(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.status) queryParams.append('status', params.status);
  if (params.type) queryParams.append('type', params.type);
  if (params.search) queryParams.append('search', params.search);
  
  const url = `/api/trainings${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return apiGet(url);
}

export async function getTrainingById(id) {
  return apiGet(`/api/trainings/${id}`);
}

export async function createTraining(data) {
  return apiPost('/api/trainings', data);
}

export async function updateTraining(id, data) {
  return apiPut(`/api/trainings/${id}`, data);
}

export async function deleteTraining(id) {
  return apiDelete(`/api/trainings/${id}`);
}

export async function getTrainingParticipants(id) {
  return apiGet(`/api/trainings/${id}/participants`);
}

export async function addParticipant(trainingId, reservistId) {
  return apiPost(`/api/trainings/${trainingId}/participants`, { reservist_id: reservistId });
}

export async function removeParticipant(trainingId, reservistId) {
  return apiDelete(`/api/trainings/${trainingId}/participants/${reservistId}`);
}

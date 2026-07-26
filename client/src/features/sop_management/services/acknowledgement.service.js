import {
  acknowledgeSop as acknowledgeSopRequest,
  createAcknowledgement as createAcknowledgementRequest,
  getAcknowledgementStats as getAcknowledgementStatsRequest,
  getAcknowledgements as getAcknowledgementsRequest,
  getMyAcknowledgements as getMyAcknowledgementsRequest,
  getPendingAcknowledgements as getPendingAcknowledgementsRequest,
} from '../api/acknowledgement.api';

function unwrapList(response) {
  const payload = response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

function unwrapItem(response) {
  const payload = response?.data ?? response;
  return payload?.data ?? payload;
}

export async function fetchAcknowledgements(sopId, params = {}) {
  const response = await getAcknowledgementsRequest(sopId, params);
  return unwrapList(response);
}

export async function fetchPendingAcknowledgements(sopId) {
  const response = await getPendingAcknowledgementsRequest(sopId);
  return unwrapList(response);
}

export async function fetchAcknowledgementStats(sopId) {
  const response = await getAcknowledgementStatsRequest(sopId);
  return unwrapItem(response);
}

export async function fetchMyAcknowledgements(params = {}) {
  const response = await getMyAcknowledgementsRequest(params);
  return unwrapList(response);
}

export async function addAcknowledgement(sopId, userId, status = 'Pending') {
  const response = await createAcknowledgementRequest(sopId, { user_id: userId, status });
  return unwrapItem(response);
}

export async function acknowledgeSop(sopId) {
  const response = await acknowledgeSopRequest(sopId);
  return unwrapItem(response);
}

import * as session from '@/services/session';

const API_BASE = '/api/employee';

function authHeaders() {
  const token = session.getCurrentToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handle(res) {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (!res.ok) {
      const error = new Error(json?.message || json?.error || `Request failed with status ${res.status}`);
      error.status = res.status;
      error.code = json?.code;
      error.response = { data: json };
      throw error;
    }
    return json;
  } catch {
    if (!res.ok) {
      const error = new Error(text || res.statusText);
      error.status = res.status;
      throw error;
    }
    return { message: text || res.statusText };
  }
}

export async function getMyOnboarding() {
  const res = await fetch(`${API_BASE}/onboarding`, { headers: authHeaders() });
  return handle(res);
}

export async function acknowledgeOnboardingSop(ackId) {
  const res = await fetch(`${API_BASE}/onboarding/${ackId}/acknowledge`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handle(res);
}
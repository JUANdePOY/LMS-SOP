import * as session from '@/services/session';

function authHeaders() {
  const token = session.getCurrentToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok && res.status !== 304) {
    const err = new Error((data && data.message) || `Request failed with status ${res.status}`);
    err.status = res.status;
    err.code = data?.code;
    err.data = data?.data;
    throw err;
  }
  return data;
}

export { authHeaders, request };
export default { authHeaders, request };

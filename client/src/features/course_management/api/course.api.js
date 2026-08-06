import * as session from '@/services/session';

const API_BASE = "/api/courses";

function authHeaders() {
  const token = session.getCurrentToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function withTimeout(promise, ms = 15000) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

async function parseJson(res) {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return json;
  } catch {
    return { message: text || res.statusText };
  }
}

function handle(res) {
  return parseJson(res).then((data) => {
    if (!res.ok) {
      const error = new Error(data?.message || data?.error || `Request failed with status ${res.status}`);
      error.status = res.status;
      error.code = data?.code;
      error.response = { data };
      throw error;
    }
    return data;
  });
}

export async function getCourseList(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`${API_BASE}?${qs.toString()}`, { headers: authHeaders() });
  return handle(res);
}

export async function getCourseById(id) {
  const res = await fetch(`${API_BASE}/${id}`, { headers: authHeaders() });
  return handle(res);
}

export async function createCourse(payload) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function updateCourse(id, payload) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function deleteCourse(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE", headers: authHeaders() });
  return handle(res);
}

export async function archiveCourse(id) {
  const res = await fetch(`${API_BASE}/${id}/archive`, { method: "PATCH", headers: authHeaders() });
  return handle(res);
}

export async function publishCourse(id) {
  const res = await fetch(`${API_BASE}/${id}/publish`, { method: "PATCH", headers: authHeaders() });
  return handle(res);
}

const BUILDER_BASE = "/api/course-builder";

export async function builderList(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`${BUILDER_BASE}?${qs.toString()}`, { headers: authHeaders() });
  return handle(res);
}

export async function builderGet(id) {
  const res = await withTimeout(fetch(`${BUILDER_BASE}/${id}`, { headers: authHeaders() }));
  return handle(res);
}

export async function builderCreate(payload) {
  const res = await fetch(BUILDER_BASE, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
  return handle(res);
}

export async function builderUpdate(id, payload) {
  const res = await withTimeout(fetch(`${BUILDER_BASE}/${id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(payload) }));
  return handle(res);
}

export async function builderDelete(id) {
  const res = await fetch(`${BUILDER_BASE}/${id}`, { method: "DELETE", headers: authHeaders() });
  return handle(res);
}

export async function uploadCourseThumbnail(file) {
  const token = session.getCurrentToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const fd = new FormData();
  fd.append("thumbnail", file);

  const res = await fetch(`${BUILDER_BASE}/thumbnail`, {
    method: "POST",
    headers,
    body: fd,
  });
  return handle(res);
}

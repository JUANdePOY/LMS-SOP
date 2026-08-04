import { request } from "@/services/api";

const API_BASE = "/events";

export async function getEvents(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  return request(`${API_BASE}?${qs.toString()}`);
}

export async function getEvent(id) {
  return request(`${API_BASE}/${id}`);
}

export async function createEvent(payload) {
  return request(API_BASE, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateEvent(id, payload) {
  return request(`${API_BASE}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteEvent(id) {
  return request(`${API_BASE}/${id}`, { method: "DELETE" });
}

import { request } from "@/services/api";

const API_BASE = "/announcements";

export async function getAnnouncements(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  return request(`${API_BASE}?${qs.toString()}`);
}

export async function getAnnouncement(id) {
  return request(`${API_BASE}/${id}`);
}

export async function createAnnouncement(payload) {
  return request(API_BASE, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateAnnouncement(id, payload) {
  return request(`${API_BASE}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteAnnouncement(id) {
  return request(`${API_BASE}/${id}`, { method: "DELETE" });
}

import { request } from "@/services/api";

const API_BASE = "/calendar";

export async function getCalendarStatus(force = false) {
  const url = `${API_BASE}/status${force ? `?_=${Date.now()}` : ''}`;
  return request(url);
}

export async function getCalendarAuthUrl() {
  return request(`${API_BASE}/auth-url`);
}

export async function syncEventToCalendar(eventId) {
  return request(`${API_BASE}/sync/${eventId}`, { method: "POST" });
}

export async function unsyncEventFromCalendar(eventId) {
  return request(`${API_BASE}/sync/${eventId}`, { method: "DELETE" });
}

export async function disconnectCalendar() {
  return request(`${API_BASE}/disconnect`, { method: "POST" });
}

import { request } from "@/services/api";

const API_BASE = "/messages";

export async function getConversations() {
  return request(`${API_BASE}/conversations`);
}

export async function getConversation(id) {
  return request(`${API_BASE}/conversations/${id}`);
}

export async function createConversation(payload) {
  return request(`${API_BASE}/conversations`, { method: "POST", body: JSON.stringify(payload) });
}

export async function sendMessage(conversationId, body) {
  return request(`${API_BASE}/conversations/${conversationId}/messages`, { method: "POST", body: JSON.stringify({ body }) });
}

export async function getMessages(conversationId) {
  return request(`${API_BASE}/conversations/${conversationId}/messages`);
}

export async function markAsRead(messageId) {
  return request(`${API_BASE}/messages/${messageId}/read`, { method: "PATCH" });
}

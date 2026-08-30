import api, { request } from "@/services/api";
import * as session from '@/services/session';

const API_BASE = "/messages";

export async function getConversations() {
  return request(`${API_BASE}/conversations`);
}

export async function getConversation(id) {
  return request(`${API_BASE}/conversations/${id}`);
}

export async function createConversation(payload) {
  return request(`${API_BASE}/conversations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendMessage(conversationId, { text, mentions, files }) {
  if (files && files.length > 0) {
    const formData = new FormData();
    if (text) formData.append('body', text);
    if (mentions && mentions.length > 0) formData.append('mentions', JSON.stringify(mentions));
    for (const file of files) {
      formData.append('files', file);
    }
    return api.post(`${API_BASE}/conversations/${conversationId}/messages`, formData, {
      skipAuthRedirect: true,
    });
  }
  return api.post(`${API_BASE}/conversations/${conversationId}/messages`, {
    body: text || '',
    mentions: mentions && mentions.length > 0 ? mentions : undefined,
  });
}

export async function getMessages(conversationId) {
  return request(`${API_BASE}/conversations/${conversationId}/messages`);
}

export async function markAsRead(messageId) {
  return request(`${API_BASE}/messages/${messageId}/read`, { method: "PATCH" });
}

export async function deleteConversation(id) {
  return request(`${API_BASE}/conversations/${id}`, { method: "DELETE" });
}

function authHeaders() {
  const token = session.getCurrentToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function extractRows(resData) {
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.rows)) return resData.rows;
  const nested = resData?.data;
  if (Array.isArray(nested)) return nested;
  if (nested && Array.isArray(nested.rows)) return nested.rows;
  if (nested && Array.isArray(nested.data)) return nested.data;
  return [];
}

export async function searchUsers(query, params = {}) {
  const qs = new URLSearchParams();
  if (query) qs.append("search", query);
  qs.append("page", String(params.page || 1));
  qs.append("limit", String(params.limit || 20));
  const res = await fetch(`/api/users?${qs.toString()}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to search users");
  return res.json();
}

export async function getCoursesForMessaging(params = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.append("search", params.search);
  qs.append("page", String(params.page || 1));
  qs.append("limit", String(params.limit || 100));
  const res = await fetch(`/api/courses?${qs.toString()}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch courses");
  return res.json();
}

export async function getCourseEnrollments(courseId) {
  const qs = new URLSearchParams();
  qs.append("course_id", String(courseId));
  qs.append("page", "1");
  qs.append("limit", "500");
  const res = await fetch(`/api/enrollments?${qs.toString()}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch course enrollments");
  return res.json();
}

export async function getCourseDiscussions(courseId) {
  const res = await fetch(`/api/discussions/course/${courseId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch discussions");
  return res.json();
}

export { extractRows };

const API_BASE = "/api/discussions";

export async function getDiscussions(courseId, params = {}) {
  const qs = new URLSearchParams({ courseId });
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`${API_BASE}?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch discussions");
  return res.json();
}

export async function createDiscussion(payload) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create discussion");
  return res.json();
}

export async function replyToDiscussion(discussionId, payload) {
  const res = await fetch(`${API_BASE}/${discussionId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to reply to discussion");
  return res.json();
}

export async function closeDiscussion(discussionId) {
  const res = await fetch(`${API_BASE}/${discussionId}/close`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to close discussion");
  return res.json();
}

export async function pinDiscussion(discussionId) {
  const res = await fetch(`${API_BASE}/${discussionId}/pin`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to pin discussion");
  return res.json();
}

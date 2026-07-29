const API_BASE = "/api/courses";

export async function getContent(courseId, moduleId) {
  const res = await fetch(`${API_BASE}/${courseId}/modules/${moduleId}/content`);
  if (!res.ok) throw new Error("Failed to fetch content");
  return res.json();
}

export async function getContentById(courseId, moduleId, contentId) {
  const res = await fetch(`${API_BASE}/${courseId}/modules/${moduleId}/content/${contentId}`);
  if (!res.ok) throw new Error("Failed to fetch content");
  return res.json();
}

export async function createContent(courseId, moduleId, payload) {
  const res = await fetch(`${API_BASE}/${courseId}/modules/${moduleId}/content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create content");
  return res.json();
}

export async function updateContent(courseId, moduleId, contentId, payload) {
  const res = await fetch(`${API_BASE}/${courseId}/modules/${moduleId}/content/${contentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update content");
  return res.json();
}

export async function deleteContent(courseId, moduleId, contentId) {
  const res = await fetch(`${API_BASE}/${courseId}/modules/${moduleId}/content/${contentId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete content");
  return res.json();
}

export async function uploadContent(courseId, moduleId, file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/${courseId}/modules/${moduleId}/content/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload content");
  return res.json();
}

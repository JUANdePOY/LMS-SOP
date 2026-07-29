export async function getModuleSummary(moduleId) {
  const res = await fetch(`/api/modules/${moduleId}/summary`);
  if (!res.ok) throw new Error("Failed to fetch module summary");
  return res.json();
}

export async function toggleModuleVisibility(moduleId, isVisible) {
  const res = await fetch(`/api/modules/${moduleId}/visibility`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isVisible }),
  });
  if (!res.ok) throw new Error("Failed to toggle visibility");
  return res.json();
}

export async function streamVideoFile(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error("Failed to load video");
  return res.blob();
}

export async function downloadContent(url, filename) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error("Failed to download content");
  const blob = await res.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

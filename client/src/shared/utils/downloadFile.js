// Triggers a browser download for a given attachment URL (same-origin with an
// HMAC token in the query string). Uses fetch + blob so the download works
// regardless of the server's Content-Disposition header, and lets us control
// the saved file name.
export async function downloadAttachment(url, filename) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Failed to download file');
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

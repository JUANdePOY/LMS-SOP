import * as session from "@/services/session";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "");

/**
 * Resolve a stored file URL to a URL the browser can actually load.
 *
 * - Absolute URLs (S3 / external CDN) are returned as-is.
 * - Local `/uploads/...` URLs are rewritten to the authenticated
 *   `/api/files/stream` route (with the JWT as a query param) because the
 *   host/proxy does not reliably serve the /uploads static directory.
 *
 * Pass `authenticated=false` for public signed routes (e.g. SOP/task
 * attachments that already carry their own token).
 */
export function resolveFileUrl(storedUrl, { authenticated = true } = {}) {
  if (!storedUrl) return null;
  if (/^https?:\/\//i.test(storedUrl)) return storedUrl;
  if (storedUrl.startsWith("/uploads/")) {
    if (!authenticated) return `${API_BASE}${storedUrl}`;
    const token = encodeURIComponent(session.getCurrentToken() || "");
    return `${API_BASE}/api/files/stream?path=${encodeURIComponent(storedUrl)}&token=${token}`;
  }
  return storedUrl;
}

export default resolveFileUrl;

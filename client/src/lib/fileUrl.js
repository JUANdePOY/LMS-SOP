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

/**
 * Rewrite every /uploads/... image source inside an HTML string to a
 * browser-loadable URL. Required when storage is the DB blob driver, where the
 * raw /uploads/... path 404s and inline images must be served through the
 * authenticated /api/files/stream route instead.
 */
export function resolveBodyImages(html) {
  if (!html || typeof html !== "string") return html;
  return html.replace(/<img([^>]+)src="(\/uploads\/[^"]+)"/gi, (match, attrs, src) => {
    const resolved = resolveFileUrl(src);
    if (!resolved || resolved === src) return match;
    return match.replace(src, resolved);
  });
}

/**
 * Reverse of resolveBodyImages: strip the authenticated /api/files/stream URL
 * (which carries a user-specific, expiring JWT token) back to the canonical
 * /uploads/... path before persisting HTML. This keeps the stored body stable
 * and viewable by every user, instead of baking in a token that expires and
 * makes the image "disappear" later.
 */
export function canonicalizeBodyImages(html) {
  if (!html || typeof html !== 'string') return html;
  return html.replace(
    /<img([^>]+)src="([^"]*\/api\/files\/stream\?path=([^&"#]+)(?:&[^"#]*)?)"/gi,
    (match, attrs, src, encPath) => {
      try {
        const decoded = decodeURIComponent(encPath);
        if (decoded.startsWith('/uploads/')) {
          return match.replace(src, decoded);
        }
      } catch {
        /* leave unchanged if the path can't be decoded */
      }
      return match;
    }
  );
}

export default resolveFileUrl;

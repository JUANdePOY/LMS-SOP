/**
 * Parse a video URL into a normalized embed descriptor.
 * Supports YouTube, Vimeo, and direct video files (mp4/webm/ogg).
 * Returns null when the URL cannot be recognized as a video source.
 */

function toSeconds(value) {
  if (value == null) return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export function parseVideoUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const url = rawUrl.trim();
  if (!url) return null;

  // Direct video file
  const directMatch = url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
  if (/^https?:\/\//i.test(url) && directMatch) {
    return {
      provider: "file",
      url,
      embedUrl: url,
      videoId: null,
      isValid: true,
    };
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    // YouTube
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      let videoId = null;
      if (host === "youtu.be") {
        videoId = parsed.pathname.slice(1).split("/")[0] || null;
      } else if (parsed.searchParams.get("v")) {
        videoId = parsed.searchParams.get("v");
      } else {
        const pathMatch = parsed.pathname.match(/\/(embed|shorts|v)\/([^/?]+)/);
        if (pathMatch) videoId = pathMatch[2];
      }
      if (!videoId) return null;
      const start = toSeconds(parsed.searchParams.get("t"));
      const startParam = start ? `&start=${start}` : "";
      return {
        provider: "youtube",
        url,
        videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0${startParam}`,
        isValid: true,
      };
    }

    // Vimeo
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      let videoId = null;
      if (host === "player.vimeo.com") {
        const m = parsed.pathname.match(/\/video\/(\d+)/);
        if (m) videoId = m[1];
      } else {
        const m = parsed.pathname.match(/\/(\d+)/);
        if (m) videoId = m[1];
      }
      if (!videoId) return null;
      return {
        provider: "vimeo",
        url,
        videoId,
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
        isValid: true,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function formatTimestamp(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${mins}:${pad(secs)}`;
}

export function parseTimestamp(input) {
  if (input == null) return null;
  const str = String(input).trim();
  if (!str) return null;
  const parts = str.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => !Number.isFinite(p))) return null;
  let seconds = 0;
  if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
  else if (parts.length === 1) seconds = parts[0];
  return seconds;
}

export const PROVIDER_LABEL = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  file: "Video File",
};

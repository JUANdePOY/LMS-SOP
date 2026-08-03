const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const VIMEO_RE = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
const DIRECT_FILE_RE = /\.(mp4|webm|og[gv]|mov|m4v|avi|wmv)(\?.*)?$/i;

export function getVideoEmbedInfo(url) {
  if (!url) return null;
  const trimmed = String(url).trim();

  const yt = trimmed.match(YOUTUBE_RE);
  if (yt && yt[1]) {
    return { type: "youtube", src: `https://www.youtube.com/embed/${yt[1]}` };
  }

  const vm = trimmed.match(VIMEO_RE);
  if (vm && vm[1]) {
    return { type: "vimeo", src: `https://player.vimeo.com/video/${vm[1]}` };
  }

  return { type: "file", src: trimmed };
}

export function isDirectVideoFile(url) {
  if (!url) return false;
  return DIRECT_FILE_RE.test(String(url).trim());
}

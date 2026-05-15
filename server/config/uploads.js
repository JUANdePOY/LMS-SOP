const path = require('path');

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

function getUploadRoot() {
  return path.resolve(process.env.UPLOAD_ROOT || path.join(__dirname, '..', 'uploads'));
}

function getMaxUploadBytes() {
  const n = Number(process.env.MAX_UPLOAD_BYTES);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

/** Allowed MIME types for letter-order / training documents (local storage). */
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);

const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

function isAllowedMime(mime) {
  return mime && ALLOWED_MIME.has(String(mime).toLowerCase());
}

function safeExtFromOriginal(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  return ALLOWED_EXT.has(ext) ? ext : '';
}

function trainingDir(trainingId) {
  return path.join(getUploadRoot(), 'trainings', String(trainingId));
}

function absolutePathFromRelative(relativePath) {
  const root = path.resolve(getUploadRoot());
  const resolved = path.resolve(root, relativePath);
  const rel = path.relative(root, resolved);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;
  }
  return resolved;
}

module.exports = {
  getUploadRoot,
  getMaxUploadBytes,
  ALLOWED_MIME,
  ALLOWED_EXT,
  isAllowedMime,
  safeExtFromOriginal,
  trainingDir,
  absolutePathFromRelative,
};

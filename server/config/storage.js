const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/database');
const { getUploadRoot, absolutePathFromRelative } = require('./uploads');

const DRIVER = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

function isS3() {
  return DRIVER === 's3';
}

function isDbBlob() {
  return DRIVER === 'mysql_blob';
}

function safeKey(key) {
  return String(key || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function localSave(buffer, relativePath) {
  const absPath = path.join(getUploadRoot(), relativePath);
  return fs.mkdir(path.dirname(absPath), { recursive: true })
    .then(() => fs.writeFile(absPath, buffer))
    .then(() => `/uploads/${relativePath}`);
}

function localDelete(storedUrl) {
  if (!storedUrl || !storedUrl.startsWith('/uploads/')) return Promise.resolve();
  const abs = path.join(getUploadRoot(), storedUrl.replace(/^\/uploads\//, ''));
  return fs.unlink(abs).catch(() => {});
}

function localRead(storedUrl) {
  if (!storedUrl || !storedUrl.startsWith('/uploads/')) return Promise.resolve(null);
  const abs = path.join(getUploadRoot(), storedUrl.replace(/^\/uploads\//, ''));
  return fs.readFile(abs).catch(() => null);
}

// ---- S3 driver (lazy-loaded so local deployments never require the SDK) ----
let _s3 = null;
function getS3Client() {
  if (_s3) return _s3;
  // eslint-disable-next-line global-require
  const { S3Client } = require('@aws-sdk/client-s3');
  _s3 = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || !!process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
  return _s3;
}

function s3KeyFor(relativePath) {
  const prefix = (process.env.S3_KEY_PREFIX || '').replace(/^\/+|\/+$/g, '');
  const key = safeKey(relativePath);
  return prefix ? `${prefix}/${key}` : key;
}

function s3PublicUrl(key) {
  const bucket = process.env.S3_BUCKET;
  const endpoint = process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT;
  if (endpoint) {
    const base = endpoint.replace(/\/+$/, '');
    return `${base}/${bucket}/${key}`;
  }
  const region = process.env.S3_REGION || 'auto';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function s3Save(buffer, relativePath, contentType) {
  // eslint-disable-next-line global-require
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const key = s3KeyFor(relativePath);
  await getS3Client().send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
    ACL: process.env.S3_ACL || 'public-read',
  }));
  return s3PublicUrl(key);
}

async function s3Delete(storedUrl) {
  if (!isS3Url(storedUrl)) return;
  // eslint-disable-next-line global-require
  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const key = s3UrlToKey(storedUrl);
  if (key) {
    await getS3Client().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })).catch(() => {});
  }
}

async function s3Read(storedUrl) {
  if (!isS3Url(storedUrl)) return null;
  // eslint-disable-next-line global-require
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const key = s3UrlToKey(storedUrl);
  if (!key) return null;
  try {
    const res = await getS3Client().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    const chunks = [];
    for await (const chunk of res.Body) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

function isS3Url(storedUrl) {
  if (!storedUrl) return false;
  const endpoint = (process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || '').replace(/\/+$/, '');
  const bucket = process.env.S3_BUCKET;
  if (endpoint && storedUrl.startsWith(`${endpoint}/${bucket}/`)) return true;
  if (bucket && storedUrl.includes(`${bucket}.s3.`)) return true;
  return false;
}

function s3UrlToKey(storedUrl) {
  const bucket = process.env.S3_BUCKET;
  const endpoint = (process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || '').replace(/\/+$/, '');
  if (endpoint) {
    const marker = `${endpoint}/${bucket}/`;
    if (storedUrl.startsWith(marker)) return storedUrl.slice(marker.length);
  }
  const region = process.env.S3_REGION || 'auto';
  const marker = `https://${bucket}.s3.${region}.amazonaws.com/`;
  if (storedUrl.startsWith(marker)) return storedUrl.slice(marker.length);
  return null;
}

function randomName(ext) {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

/**
 * Persist a buffer under a logical relative path (e.g. "avatars/1/avatar-123.jpg").
 * Returns the URL to store in the DB: a relative /uploads/... path for local,
 * or an absolute object URL for S3. Both render correctly in any environment.
 */
function dbKeyFromStoredUrl(storedUrl) {
  if (!storedUrl || typeof storedUrl !== 'string') return null;
  const clean = storedUrl.split('?')[0];
  if (clean.startsWith('/uploads/')) {
    return clean.replace(/^\/uploads\//, '');
  }
  if (clean.startsWith('db://')) {
    return clean.slice('db://'.length);
  }
  return null;
}

async function dbSave(buffer, relativePath, contentType) {
  const key = safeKey(relativePath);
  if (!key) {
    throw new Error('Missing storage key for DB blob save');
  }
  await db.query(
    'INSERT INTO file_blobs (`path`, content_type, size_bytes, file_data) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE content_type = VALUES(content_type), size_bytes = VALUES(size_bytes), file_data = VALUES(file_data), updated_at = CURRENT_TIMESTAMP',
    [key, contentType || null, Buffer.byteLength(buffer), buffer]
  );
  return `/uploads/${key}`;
}

async function dbDelete(storedUrl) {
  const key = dbKeyFromStoredUrl(storedUrl);
  if (!key) return;
  await db.query('DELETE FROM file_blobs WHERE `path` = ?', [key]).catch(() => {});
}

async function dbRead(storedUrl) {
  const key = dbKeyFromStoredUrl(storedUrl);
  if (!key) return null;
  const [rows] = await db.query('SELECT file_data FROM file_blobs WHERE `path` = ? LIMIT 1', [key]);
  if (!rows || rows.length === 0) return null;
  return rows[0].file_data || null;
}

async function dbStream(storedUrl) {
  const key = dbKeyFromStoredUrl(storedUrl);
  if (!key) return null;
  const [rows] = await db.query('SELECT file_data, content_type FROM file_blobs WHERE `path` = ? LIMIT 1', [key]);
  if (!rows || rows.length === 0) return null;
  return {
    buffer: rows[0].file_data,
    contentType: rows[0].content_type || null,
  };
}

async function saveFile({ buffer, dir, filename, contentType }) {
  const ext = path.extname(filename || '');
  const base = filename ? path.basename(filename) : randomName(ext || '.bin');
  const relativePath = safeKey(path.posix.join(dir, base));
  if (isS3()) {
    return s3Save(buffer, relativePath, contentType);
  }
  if (isDbBlob()) {
    return dbSave(buffer, relativePath, contentType);
  }
  return localSave(buffer, relativePath);
}

async function deleteFile(storedUrl) {
  if (!storedUrl) return;
  if (isS3()) return s3Delete(storedUrl);
  if (isDbBlob()) return dbDelete(storedUrl);
  return localDelete(storedUrl);
}

async function readFile(storedUrl) {
  if (!storedUrl) return null;
  if (isS3()) return s3Read(storedUrl);
  if (isDbBlob()) return dbRead(storedUrl);
  return localRead(storedUrl);
}

// Read a stored file and return { buffer, contentType } for streaming to the
// client through an authenticated Express route (avoids express.static, which
// is unreliable behind some hosts/proxies). Works for both drivers.
const STREAM_MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.doc': 'application/msword', '.xls': 'application/vnd.ms-excel',
};

async function streamFile(storedUrl) {
  if (isDbBlob()) {
    const result = await dbStream(storedUrl);
    if (!result || !result.buffer) return null;
    const clean = String(storedUrl).split('?')[0];
    const ext = path.extname(clean).toLowerCase();
    return {
      buffer: result.buffer,
      contentType: result.contentType || STREAM_MIME[ext] || 'application/octet-stream',
    };
  }
  const buffer = await readFile(storedUrl);
  if (!buffer) return null;
  const clean = String(storedUrl).split('?')[0];
  const ext = path.extname(clean).toLowerCase();
  return { buffer, contentType: STREAM_MIME[ext] || 'application/octet-stream' };
}

function isExternalUrl(storedUrl) {
  return isS3Url(storedUrl) || /^https?:\/\//i.test(storedUrl || '');
}

async function ensureLocalRoot() {
  if (isS3() || isDbBlob()) return;
  await fs.mkdir(getUploadRoot(), { recursive: true });
}

module.exports = {
  DRIVER,
  isS3,
  isExternalUrl,
  saveFile,
  deleteFile,
  readFile,
  streamFile,
  ensureLocalRoot,
  // exposed for proxy route / advanced consumers
  s3PublicUrl,
  s3UrlToKey,
  absolutePathFromRelative,
  s3KeyFor,
};

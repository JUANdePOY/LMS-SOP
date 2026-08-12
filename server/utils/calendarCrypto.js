const crypto = require('crypto');
const { resolveKey, getCachedKey } = require('./calendarKey');

// AES-256-GCM encryption for sensitive data (Google OAuth tokens) at rest.
// The key is resolved (env var, else a DB-persisted key) by calendarKey.js so it
// stays stable across restarts/redeploys. We kick off async resolution at module
// load; getKey() falls back to a direct env read synchronously for the common
// case, then uses the resolved key once available.
const ALGO = 'aes-256-gcm';

// Start resolving the key eagerly so it's ready before the first token op.
resolveKey().catch((err) => {
  console.error('[Calendar] Encryption key resolution failed:', err.message);
});

function envKeyBuffer() {
  const raw = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (raw && /^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return null;
}

function getKey() {
  // Prefer the explicit env var; otherwise the resolved (possibly DB-persisted)
  // key. One of these must be present after resolveKey() completes.
  const key = envKeyBuffer() || getCachedKey();
  if (!key) {
    const err = new Error('CALENDAR_TOKEN_ENCRYPTION_KEY is not available (env not set and key not yet resolved)');
    err.statusCode = 500;
    throw err;
  }
  if (key.length !== 32) {
    const err = new Error('CALENDAR_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
    err.statusCode = 500;
    throw err;
  }
  return key;
}

function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as base64: iv | tag | ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(ciphertext) {
  if (ciphertext === null || ciphertext === undefined) return null;
  const key = getKey();
  const data = Buffer.from(ciphertext, 'base64');
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };

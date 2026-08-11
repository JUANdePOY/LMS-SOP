const crypto = require('crypto');

// AES-256-GCM encryption for sensitive data (Google OAuth tokens) at rest.
// Key is provided via CALENDAR_TOKEN_ENCRYPTION_KEY as a 64-char hex string (32 bytes).
const ALGO = 'aes-256-gcm';

function getKey() {
  const raw = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    const err = new Error('CALENDAR_TOKEN_ENCRYPTION_KEY is not configured');
    err.statusCode = 500;
    throw err;
  }
  const key = Buffer.from(raw, 'hex');
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

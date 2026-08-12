const crypto = require('crypto');
const db = require('../config/database');

// Resolves a stable AES-256 key for encrypting Google Calendar tokens at rest.
//
// Priority:
//   1. CALENDAR_TOKEN_ENCRYPTION_KEY env var (explicit, recommended for prod).
//   2. A key persisted in the `system_settings` table under
//      'calendar_token_encryption_key'. This guarantees the SAME key is used
//      across server restarts and Hostinger redeploys even when no env var is
//      configured — preventing the "Failed to decrypt token / forced reconnect"
//      loop that happens when a key is regenerated on every boot.
//
// The key is cached after first resolution so we don't hit the DB on every
// encrypt/decrypt call.
const SETTINGS_KEY = 'calendar_token_encryption_key';

let cachedKey = null;
let resolvePromise = null;

function isValidHexKey(raw) {
  return typeof raw === 'string' && /^[0-9a-fA-F]{64}$/.test(raw);
}

async function loadFromSettings() {
  const [rows] = await db.query('SELECT `value` FROM system_settings WHERE `key` = ?', [SETTINGS_KEY]);
  const row = rows && rows[0];
  return row && isValidHexKey(row.value) ? row.value : null;
}

async function persistToSettings(raw) {
  await db.query(
    `INSERT INTO system_settings (\`key\`, \`value\`, description)
     VALUES (?, ?, 'AES-256 key for Google Calendar token encryption at rest')
     ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
    [SETTINGS_KEY, raw]
  );
}

// Returns a 32-byte Buffer. Generates and persists a key on first use when none
// exists yet. Throws only if persistence is impossible and no env key is set.
async function resolveKey() {
  if (cachedKey) return cachedKey;
  if (resolvePromise) return resolvePromise;

  resolvePromise = (async () => {
    const envKey = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
    if (isValidHexKey(envKey)) {
      cachedKey = Buffer.from(envKey, 'hex');
      return cachedKey;
    }

    try {
      const stored = await loadFromSettings();
      if (stored) {
        cachedKey = Buffer.from(stored, 'hex');
        return cachedKey;
      }
    } catch (err) {
      console.error('[Calendar] Failed to read encryption key from settings:', err.message);
    }

    // No key anywhere yet — generate one and persist it for future boots.
    const generated = crypto.randomBytes(32).toString('hex');
    try {
      await persistToSettings(generated);
    } catch (err) {
      console.error('[Calendar] Failed to persist generated encryption key:', err.message);
    }
    cachedKey = Buffer.from(generated, 'hex');
    return cachedKey;
  })();

  try {
    return await resolvePromise;
  } finally {
    resolvePromise = null;
  }
}

// Synchronous accessor for code paths that cannot await (e.g. crypto util).
// Returns null until the key has been resolved at least once via resolveKey().
function getCachedKey() {
  return cachedKey;
}

// Forces re-resolution on next access (e.g. after a config change).
function reset() {
  cachedKey = null;
  resolvePromise = null;
}

async function getKeySource() {
  // Return where the effective key will come from: 'env', 'db', 'generated', or 'none'
  const envKey = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (isValidHexKey(envKey)) return 'env';
  try {
    const stored = await loadFromSettings();
    if (stored) return 'db';
  } catch (err) {
    // ignore
  }
  if (cachedKey) return 'generated';
  return 'none';
}

module.exports = { resolveKey, getCachedKey, reset, SETTINGS_KEY, getKeySource };

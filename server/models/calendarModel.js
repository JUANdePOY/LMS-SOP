const crypto = require('crypto');
const db = require('../config/database');
const { encrypt, decrypt } = require('../utils/calendarCrypto');

// Decrypt but never throw on corrupt/stale data (e.g. row encrypted with a
// previous CALENDAR_TOKEN_ENCRYPTION_KEY after a key rotation). Returns null
// so the caller can treat the token as absent. We intentionally do NOT delete
// the row here: during a re-connect the polling status check can read the
// still-stale row and would race with saveToken's INSERT, wiping the freshly
// stored token. saveToken overwrites the row via ON DUPLICATE KEY UPDATE, so
// the row heals on connect without a destructive race.
function safeDecrypt(value) {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch {
    return null;
  }
}

async function purgeUndecryptableRows(userId, provider = 'google') {
  try {
    const [rows] = await db.query(
      'SELECT id, access_token, refresh_token FROM user_calendar_tokens WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );
    const badIds = rows
      .filter((r) => (r.access_token && !safeDecrypt(r.access_token)) || (r.refresh_token && !safeDecrypt(r.refresh_token)))
      .map((r) => r.id);
    if (badIds.length) {
      await db.query('DELETE FROM user_calendar_tokens WHERE id IN (?)', [badIds]);
    }
  } catch {
    // silent cleanup
  }
}

const calendarModel = {
  async getToken(userId, provider = 'google') {
    const [rows] = await db.query(
      'SELECT * FROM user_calendar_tokens WHERE user_id = ? AND provider = ? ORDER BY updated_at DESC',
      [userId, provider]
    );
    if (!rows.length) return null;
    for (const row of rows) {
      const access_token = safeDecrypt(row.access_token);
      const refresh_token = safeDecrypt(row.refresh_token);
      if (access_token) {
        if (rows.length > 1) await purgeUndecryptableRows(userId, provider);
        return { ...row, access_token, refresh_token };
      }
    }
    await purgeUndecryptableRows(userId, provider);
    return null;
  },

  async saveToken({ userId, provider = 'google', googleEmail, accessToken, refreshToken, expiryDate }) {
    const encAccess = encrypt(accessToken);
    const encRefresh = refreshToken ? encrypt(refreshToken) : null;
    await purgeUndecryptableRows(userId, provider);

    const values = [userId, provider, googleEmail || null, encAccess, encRefresh, expiryDate || null];
    let inserted = false;

    try {
      const [result] = await db.query(
        `INSERT INTO user_calendar_tokens (user_id, provider, google_email, access_token, refresh_token, expiry_date)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           google_email = VALUES(google_email),
           access_token = VALUES(access_token),
           refresh_token = VALUES(refresh_token),
           expiry_date = VALUES(expiry_date),
           updated_at = CURRENT_TIMESTAMP`,
        values
      );
      inserted = true;
    } catch {
      try {
        const [updateResult] = await db.query(
          `UPDATE user_calendar_tokens
           SET google_email = ?, access_token = ?, refresh_token = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND provider = ?`,
          [googleEmail || null, encAccess, encRefresh, expiryDate || null, userId, provider]
        );
        if (updateResult && updateResult.affectedRows > 0) {
          inserted = true;
        }
      } catch {
        // silent fallback
      }
    }

    if (!inserted) {
      try {
        const [maxRows] = await db.query('SELECT MAX(id) AS max_id FROM user_calendar_tokens');
        const nextId = (maxRows && maxRows[0] && maxRows[0].max_id) ? Number(maxRows[0].max_id) + 1 : 1;
        const [explicitResult] = await db.query(
          `INSERT INTO user_calendar_tokens (id, user_id, provider, google_email, access_token, refresh_token, expiry_date)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [nextId, userId, provider, googleEmail || null, encAccess, encRefresh, expiryDate || null]
        );
        inserted = true;
      } catch {
        // silent fallback
      }
    }

    if (!inserted) {
      throw new Error('Failed to persist calendar token');
    }

    const result = await this.getToken(userId, provider);
    return result;
  },

  // Used when refreshing: only update access token + expiry, never drop refresh token.
  async updateAccessToken(userId, accessToken, expiryDate, provider = 'google') {
    const encAccess = encrypt(accessToken);
    await db.query(
      `UPDATE user_calendar_tokens
       SET access_token = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND provider = ?`,
      [encAccess, expiryDate || null, userId, provider]
    );
    return this.getToken(userId, provider);
  },

  async deleteToken(userId, provider = 'google') {
    await db.query(
      'DELETE FROM user_calendar_tokens WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );
    return { userId, provider };
  },

  async findMapsForEvent(eventId) {
    const [rows] = await db.query(
      'SELECT * FROM calendar_event_map WHERE event_id = ?',
      [eventId]
    );
    return rows;
  },

  async findMap(userId, eventId) {
    const [rows] = await db.query(
      'SELECT * FROM calendar_event_map WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );
    return rows[0] || null;
  },

  async saveMap({ userId, eventId, googleEventId, googleCalendarId = 'primary', syncStatus = 'synced' }) {
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO calendar_event_map (id, user_id, event_id, google_event_id, google_calendar_id, sync_status, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
         google_event_id = VALUES(google_event_id),
         google_calendar_id = VALUES(google_calendar_id),
         sync_status = VALUES(sync_status),
         last_synced_at = CURRENT_TIMESTAMP`,
      [id, userId, eventId, googleEventId, googleCalendarId, syncStatus]
    );
    return this.findMap(userId, eventId);
  },

  async updateMapStatus(userId, eventId, syncStatus) {
    await db.query(
      'UPDATE calendar_event_map SET sync_status = ?, last_synced_at = CURRENT_TIMESTAMP WHERE user_id = ? AND event_id = ?',
      [syncStatus, userId, eventId]
    );
    return this.findMap(userId, eventId);
  },

  async deleteMapByEvent(eventId) {
    await db.query('DELETE FROM calendar_event_map WHERE event_id = ?', [eventId]);
    return { eventId };
  },

  async deleteMapByUser(userId) {
    await db.query('DELETE FROM calendar_event_map WHERE user_id = ?', [userId]);
    return { userId };
  },

  async deleteMap(userId, eventId) {
    await db.query(
      'DELETE FROM calendar_event_map WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );
    return { userId, eventId };
  },

  // --- OAuth state (server-side, replaces HMAC-signed state) ---
  async saveOAuthState(userId, stateToken, expiresAt) {
    await db.query(
      `INSERT INTO calendar_oauth_states (user_id, state_token, expires_at)
       VALUES (?, ?, ?)`,
      [userId, stateToken, expiresAt]
    );
    return stateToken;
  },

  // Returns the matching row if the state exists and is unexpired, else null.
  async getOAuthState(stateToken) {
    const [rows] = await db.query(
      'SELECT * FROM calendar_oauth_states WHERE state_token = ?',
      [stateToken]
    );
    const row = rows[0];
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;
    return row;
  },

  async deleteOAuthState(stateToken) {
    await db.query(
      'DELETE FROM calendar_oauth_states WHERE state_token = ?',
      [stateToken]
    );
    return stateToken;
  },

  // Best-effort cleanup of expired states.
  async purgeExpiredOAuthStates() {
    await db.query(
      'DELETE FROM calendar_oauth_states WHERE expires_at < NOW()'
    );
  },
};

module.exports = calendarModel;

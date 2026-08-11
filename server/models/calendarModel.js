const crypto = require('crypto');
const db = require('../config/database');
const { encrypt, decrypt } = require('../utils/calendarCrypto');

const calendarModel = {
  async getToken(userId, provider = 'google') {
    const [rows] = await db.query(
      'SELECT * FROM user_calendar_tokens WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );
    const row = rows[0];
    if (!row) return null;
    return {
      ...row,
      access_token: row.access_token ? decrypt(row.access_token) : null,
      refresh_token: row.refresh_token ? decrypt(row.refresh_token) : null,
    };
  },

  async saveToken({ userId, provider = 'google', googleEmail, accessToken, refreshToken, expiryDate }) {
    const encAccess = encrypt(accessToken);
    const encRefresh = refreshToken ? encrypt(refreshToken) : null;
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO user_calendar_tokens (id, user_id, provider, google_email, access_token, refresh_token, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         google_email = VALUES(google_email),
         access_token = VALUES(access_token),
         refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
         expiry_date = VALUES(expiry_date),
         updated_at = CURRENT_TIMESTAMP`,
      [id, userId, provider, googleEmail || null, encAccess, encRefresh, expiryDate || null]
    );
    return this.getToken(userId, provider);
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

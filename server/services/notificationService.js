const db = require('../config/database');
const { broadcastToUser } = require('../websocket/clients');
const prefs = require('./notificationPreferenceService');

const DEDUP_WINDOW_MS = 30 * 60 * 1000;

// A notification is in-app visible regardless of category preference (the user
// can still open the panel and read it), but push/email/sound channels are
// gated by the user's per-category and per-channel preferences and quiet hours.
async function shouldSuppressChannels(userId, category) {
  try {
    const quiet = await prefs.isQuietHours(userId);
    const categoryOn = await prefs.isCategoryEnabled(userId, category);
    const pushOn = await prefs.isChannelEnabled(userId, 'push');
    const soundOn = await prefs.isChannelEnabled(userId, 'sound');
    return {
      suppressPush: quiet || !categoryOn || !pushOn,
      suppressSound: quiet || !categoryOn || !soundOn,
    };
  } catch {
    return { suppressPush: false, suppressSound: false };
  }
}

async function createNotification({
  userId,
  title,
  body,
  type = 'info',
  link,
  entityType,
  entityId,
  priority = 0,
  category = 'system',
  imageUrl = null,
  scheduledAt = null,
  expiresAt = null,
  actionLabel = null,
  actionUrl = null,
  soundEnabled = 1,
  disablePush = false,
  disableSound = false,
}) {
  if (!userId || !title) return null;

  const result = await db.query(
    `INSERT INTO notifications
      (user_id, title, body, type, link, entity_type, entity_id, priority, category, image_url, scheduled_at, expires_at, action_label, action_url, sound_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      String(title).slice(0, 255),
      body || null,
      type,
      link || null,
      entityType || null,
      entityId || null,
      priority || 0,
      category || 'system',
      imageUrl || null,
      scheduledAt || null,
      expiresAt || null,
      actionLabel || null,
      actionUrl || null,
      soundEnabled ? 1 : 0,
    ]
  );

  const notificationId = result[0]?.insertId || null;

  if (notificationId) {
    const payload = {
      type: 'notification',
      action: 'created',
      data: {
        id: notificationId,
        title,
        body,
        type,
        link,
        entity_type: entityType,
        entity_id: entityId,
        priority,
        category,
        image_url: imageUrl,
        action_label: actionLabel,
        action_url: actionUrl,
        created_at: new Date().toISOString(),
      },
    };

    const sent = broadcastToUser(userId, payload);

    const { suppressPush, suppressSound } = await shouldSuppressChannels(userId, category);
    if (!suppressPush && !disablePush) triggerDevicePush(userId, payload.data).catch(() => {});
    if (!suppressSound && !disableSound && soundEnabled) triggerSound(userId).catch(() => {});
  }

  return notificationId;
}

async function findExistingNotification(userId, entityType, entityId, action) {
  const [rows] = await db.query(
    `SELECT id, created_at FROM notifications
     WHERE user_id = ? AND entity_type = ? AND entity_id = ? AND title LIKE ?
     ORDER BY created_at DESC LIMIT 1`,
    [userId, entityType, entityId, `${action}%`]
  );
  return rows[0] || null;
}

async function deduplicatedCreate({ userId, title, body, type, link, entityType, entityId, priority, category, imageUrl, scheduledAt, expiresAt, actionLabel, actionUrl, soundEnabled, disablePush, disableSound }) {
  if (!userId || !title || !entityType || !entityId) {
    return createNotification({ userId, title, body, type, link, entityType, entityId, priority, category, imageUrl, scheduledAt, expiresAt, actionLabel, actionUrl, soundEnabled, disablePush, disableSound });
  }

  const actionPrefix = `${entityType}_${title.toLowerCase().replace(/\s+/g, '_').slice(0, 30)}`;
  const existing = await findExistingNotification(userId, entityType, entityId, actionPrefix);

  if (existing) {
    const createdAt = new Date(existing.created_at).getTime();
    if (Date.now() - createdAt < DEDUP_WINDOW_MS) {
      await db.query(
        `UPDATE notifications SET title = ?, body = ?, created_at = NOW(), type = ?, link = ?, priority = ?, category = ?, image_url = ?, action_label = ?, action_url = ?, sound_enabled = ?
         WHERE id = ?`,
        [
          title,
          body || null,
          type || 'info',
          link || null,
          priority || 0,
          category || 'system',
          imageUrl || null,
          actionLabel || null,
          actionUrl || null,
          soundEnabled ? 1 : 0,
          existing.id,
        ]
      );
      return existing.id;
    }
  }

  return createNotification({ userId, title, body, type, link, entityType, entityId, priority, category, imageUrl, scheduledAt, expiresAt, actionLabel, actionUrl, soundEnabled, disablePush, disableSound });
}

async function broadcastSystemChange({ title, body, type = 'info', link, entityType, entityId, excludeUserId = null, targetUserIds = null, priority, category, imageUrl, scheduledAt, expiresAt, actionLabel, actionUrl, soundEnabled }) {
  if (!title || !entityType || !entityId) return [];

  try {
    let userIds = targetUserIds;
    if (!userIds) {
      const [userRows] = await db.query(
        `SELECT id FROM users WHERE is_active = 1 ${excludeUserId ? 'AND id <> ?' : ''}`,
        excludeUserId ? [excludeUserId] : []
      );
      userIds = userRows.map((u) => u.id);
    } else if (excludeUserId) {
      userIds = userIds.filter((id) => id !== excludeUserId);
    }

    const promises = userIds
      .filter((id) => Number.isInteger(id) && id > 0)
      .map((id) =>
        deduplicatedCreate({
          userId: id,
          title,
          body,
          type,
          link,
          entityType,
          entityId,
          priority,
          category,
          imageUrl,
          scheduledAt,
          expiresAt,
          actionLabel,
          actionUrl,
          soundEnabled,
        }).catch(() => null)
      );

    const results = await Promise.all(promises);
    const createdIds = results.filter((id) => id != null);

    if (createdIds.length > 0) {
      const payload = {
        type: 'notification',
        action: 'created',
        data: {
          title,
          body,
          type,
          link,
          entity_type: entityType,
          entity_id: entityId,
          priority,
          category,
          image_url: imageUrl,
          action_label: actionLabel,
          action_url: actionUrl,
          created_at: new Date().toISOString(),
        },
      };

      for (const id of createdIds) {
        broadcastToUser(id, payload).catch(() => {});
        const { suppressPush, suppressSound } = await shouldSuppressChannels(id, category);
        if (!suppressPush) triggerDevicePush(id, payload.data).catch(() => {});
        if (!suppressSound && soundEnabled) triggerSound(id).catch(() => {});
      }
    }

    return createdIds;
  } catch {
    return [];
  }
}

async function createSystemNotification({ userId, title, body, type = 'info', link, entityType, entityId, priority, category, imageUrl, scheduledAt, expiresAt, actionLabel, actionUrl, soundEnabled }) {
  return deduplicatedCreate({ userId, title, body, type, link, entityType, entityId, priority, category, imageUrl, scheduledAt, expiresAt, actionLabel, actionUrl, soundEnabled });
}

async function triggerDevicePush(userId, data) {
  try {
    const { sendPushNotification } = require('./pushNotificationService');
    if (sendPushNotification) {
      await sendPushNotification(userId, data);
    }
  } catch {
    // push service not configured or failed — silent fallback
  }
}

// Surface a sound cue to the connected client via the WebSocket channel. The
// actual audio playback is performed client-side, gated by the user's sound
// preference and quiet hours (see shouldSuppressChannels).
async function triggerSound(userId) {
  try {
    const { broadcastToUser } = require('../websocket/clients');
    broadcastToUser(userId, { type: 'notification', action: 'sound', data: { at: new Date().toISOString() } });
  } catch {
    // no-op if WS unavailable
  }
}

module.exports = {
  createNotification,
  broadcastSystemChange,
  createSystemNotification,
  triggerSound,
};

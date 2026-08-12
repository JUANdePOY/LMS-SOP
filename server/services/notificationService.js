const db = require('../config/database');
const { broadcastToUser } = require('../websocket/clients');

const DEDUP_WINDOW_MS = 30 * 60 * 1000;

async function createNotification({ userId, title, body, type = 'info', link, entityType, entityId }) {
  if (!userId || !title) return null;

  const result = await db.query(
    `INSERT INTO notifications (user_id, title, body, type, link, entity_type, entity_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, String(title).slice(0, 255), body || null, type, link || null, entityType || null, entityId || null]
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
        created_at: new Date().toISOString(),
      },
    };

    const sent = broadcastToUser(userId, payload);

    if (sent === 0) {
      triggerDevicePush(userId, payload.data).catch(() => {});
    }
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

async function deduplicatedCreate({ userId, title, body, type, link, entityType, entityId }) {
  if (!userId || !title || !entityType || !entityId) {
    return createNotification({ userId, title, body, type, link, entityType, entityId });
  }

  const actionPrefix = `${entityType}_${title.toLowerCase().replace(/\s+/g, '_').slice(0, 30)}`;
  const existing = await findExistingNotification(userId, entityType, entityId, actionPrefix);

  if (existing) {
    const createdAt = new Date(existing.created_at).getTime();
    if (Date.now() - createdAt < DEDUP_WINDOW_MS) {
      await db.query(
        `UPDATE notifications SET title = ?, body = ?, created_at = NOW(), type = ?, link = ?
         WHERE id = ?`,
        [title, body || null, type || 'info', link || null, existing.id]
      );
      return existing.id;
    }
  }

  return createNotification({ userId, title, body, type, link, entityType, entityId });
}

async function broadcastSystemChange({ title, body, type = 'info', link, entityType, entityId, excludeUserId = null }) {
  if (!title || !entityType || !entityId) return [];

  try {
    const [userRows] = await db.query(
      `SELECT id FROM users WHERE is_active = 1 AND role NOT IN ('super_admin') ${excludeUserId ? 'AND id <> ?' : ''}`,
      excludeUserId ? [excludeUserId] : []
    );

    const promises = userRows
      .map((u) => u.id)
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
          created_at: new Date().toISOString(),
        },
      };

      for (const id of createdIds) {
        const row = userRows.find((u) => u.id === id);
        if (row) {
          broadcastToUser(row.id, payload).catch(() => {});
        }
      }
    }

    return createdIds;
  } catch {
    return [];
  }
}

async function createSystemNotification({ userId, title, body, type = 'info', link, entityType, entityId }) {
  return deduplicatedCreate({ userId, title, body, type, link, entityType, entityId });
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

module.exports = {
  createNotification,
  broadcastSystemChange,
  createSystemNotification,
};

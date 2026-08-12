const router = require('express').Router();
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { broadcastSystemChange, createSystemNotification } = require('../services/notificationService');
const { subscribe, unsubscribe } = require('../services/pushNotificationService');

function sendError(res, statusCode, code, message) {
  return res.status(statusCode).json({ success: false, code, message });
}

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const unreadOnly = req.query.unread_only === 'true';
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];
    if (unreadOnly) {
      whereClause += ' AND is_read = FALSE';
    }
    const [rows] = await db.query(
      `SELECT id, title, body, type, is_read, link, entity_type, entity_id, created_at FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ?`,
      [...params, limit]
    );
    const [unreadResult] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    res.json({
      notifications: rows,
      unread_count: unreadResult[0].count,
    });
  } catch (err) {
    console.error('Notification fetch error:', err);
    res.status(500).json({ code: 'NOTIFICATION_FETCH_ERROR', message: 'Failed to fetch notifications' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, body, type = 'info', link, entity_type, entity_id } = req.body;

    if (!title) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Title is required');
    }

    const notificationId = await createSystemNotification({
      userId,
      title,
      body,
      type,
      link,
      entityType: entity_type,
      entityId: entity_id ? Number(entity_id) : null,
    });

    if (!notificationId) {
      return sendError(res, 500, 'NOTIFICATION_CREATE_ERROR', 'Failed to create notification');
    }

    res.status(201).json({ success: true, data: { id: notificationId } });
  } catch (err) {
    console.error('Notification create error:', err);
    res.status(500).json({ code: 'NOTIFICATION_CREATE_ERROR', message: 'Failed to create notification' });
  }
});

router.post('/broadcast', requireAdmin, async (req, res) => {
  try {
    const { title, body, type = 'info', link, entity_type, entity_id } = req.body;

    if (!title || !entity_type || !entity_id) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Title, entity_type, and entity_id are required');
    }

    const ids = await broadcastSystemChange({
      title,
      body,
      type,
      link,
      entityType: entity_type,
      entityId: Number(entity_id),
    });

    res.status(201).json({ success: true, data: { count: ids.length } });
  } catch (err) {
    console.error('Notification broadcast error:', err);
    res.status(500).json({ code: 'NOTIFICATION_BROADCAST_ERROR', message: 'Failed to broadcast notification' });
  }
});

router.patch('/read', async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationIds = req.body.ids || [];
    if (notificationIds.length === 0) {
      await db.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
        [userId]
      );
    } else {
      const placeholders = notificationIds.map(() => '?').join(',');
      await db.query(
        `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND id IN (${placeholders})`,
        [userId, ...notificationIds]
      );
    }
    const [unreadResult] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    res.json({ success: true, unread_count: unreadResult[0].count });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ code: 'MARK_READ_ERROR', message: 'Failed to mark notifications as read' });
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    res.json({ success: true, unread_count: 0 });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ code: 'MARK_ALL_READ_ERROR', message: 'Failed to mark all notifications as read' });
  }
});

router.post('/push/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await subscribe(userId, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('Push subscribe error:', err);
    const code = err.message === 'INVALID_SUBSCRIPTION' ? 'INVALID_SUBSCRIPTION' : 'PUSH_SUBSCRIBE_ERROR';
    res.status(400).json({ success: false, code, message: 'Failed to save push subscription' });
  }
});

router.post('/push/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const endpoint = req.body.endpoint;
    await unsubscribe(endpoint);
    res.json({ success: true });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    res.status(500).json({ success: false, code: 'PUSH_UNSUBSCRIBE_ERROR', message: 'Failed to remove push subscription' });
  }
});

router.get('/push/check', authenticateToken, (req, res) => {
  res.json({
    supported: typeof window !== 'undefined'
      ? 'serviceWorker' in navigator && 'PushManager' in window
      : false,
  });
});

module.exports = router;

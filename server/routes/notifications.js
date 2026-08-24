const router = require('express').Router();
const db = require('../config/database');
const { authenticateToken, resolveScope } = require('../middleware/auth');
const { requirePermission } = require('../middleware/scope');
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
    const category = req.query.category || null;
    const priorityMin = req.query.priority ? parseInt(req.query.priority, 10) : null;
    const cursor = req.query.cursor || null; // ISO created_at of last item

    let whereClause = 'WHERE user_id = ?';
    const params = [userId];
    if (unreadOnly) {
      whereClause += ' AND is_read = FALSE';
    }
    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }
    if (priorityMin != null && !Number.isNaN(priorityMin)) {
      whereClause += ' AND priority >= ?';
      params.push(priorityMin);
    }
    if (cursor) {
      whereClause += ' AND created_at < ?';
      params.push(cursor);
    }

    const [rows] = await db.query(
      `SELECT id, title, body, type, is_read, link, entity_type, entity_id, priority, category, image_url, action_label, action_url, created_at
       FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ?`,
      [...params, limit + 1]
    );

    let nextCursor = null;
    if (rows.length > limit) {
      nextCursor = rows[limit - 1].created_at;
      rows.length = limit;
    }

    const [unreadResult] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    res.json({
      notifications: rows,
      unread_count: unreadResult[0].count,
      next_cursor: nextCursor,
    });
  } catch (err) {
    console.error('Notification fetch error:', err);
    res.status(500).json({ code: 'NOTIFICATION_FETCH_ERROR', message: 'Failed to fetch notifications' });
  }
});

router.post('/', resolveScope, requirePermission('notifications.send'), async (req, res) => {
  try {
    let targetUserId = req.body.user_id ? Number(req.body.user_id) : req.user.id;
    const { title, body, type = 'info', link, entity_type, entity_id } = req.body;

    if (!title) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Title is required');
    }

    if (targetUserId !== req.user.id) {
      const role = req.user?.role;
      if (role === 'department_head') {
        const scopedDeptIds = req.user.scoped_department_ids || [];
        const [[targetUser]] = await db.query(
          'SELECT department_id FROM users WHERE id = ? AND is_active = 1',
          [targetUserId]
        );
        if (!targetUser || !scopedDeptIds.includes(targetUser.department_id)) {
          return sendError(res, 403, 'SCOPE_ERROR', 'Target user is outside your department scope');
        }
      }
    }

    const notificationId = await createSystemNotification({
      userId: targetUserId,
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

router.post('/broadcast', resolveScope, requirePermission('notifications.broadcast'), async (req, res) => {
  try {
    const { title, body, type = 'info', link, entity_type, entity_id } = req.body;

    if (!title || !entity_type || !entity_id) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Title, entity_type, and entity_id are required');
    }

    let targetUserIds = null;
    const role = req.user?.role;

    if (role === 'department_head') {
      const scopedDeptIds = req.user.scoped_department_ids || [];
      if (scopedDeptIds.length === 0) {
        return sendError(res, 403, 'SCOPE_ERROR', 'No department scope assigned');
      }
      const [rows] = await db.query(
        'SELECT id FROM users WHERE is_active = 1 AND role NOT IN (\'super_admin\') AND department_id IN (?)',
        [scopedDeptIds]
      );
      targetUserIds = rows.map((u) => u.id);
    }

    const ids = await broadcastSystemChange({
      title,
      body,
      type,
      link,
      entityType: entity_type,
      entityId: Number(entity_id),
      excludeUserId: req.user.id,
      targetUserIds,
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
        'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
        [userId]
      );
    } else {
      const placeholders = notificationIds.map(() => '?').join(',');
      await db.query(
        `UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND id IN (${placeholders})`,
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
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    res.json({ success: true, unread_count: 0 });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ code: 'MARK_ALL_READ_ERROR', message: 'Failed to mark all notifications as read' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const [result] = await db.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Notification not found' });
    }
    const [unreadResult] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    res.json({ success: true, unread_count: unreadResult[0].count });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ code: 'DELETE_ERROR', message: 'Failed to delete notification' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      await db.query('DELETE FROM notifications WHERE user_id = ?', [userId]);
    } else {
      const placeholders = ids.map(() => '?').join(',');
      await db.query(
        `DELETE FROM notifications WHERE user_id = ? AND id IN (${placeholders})`,
        [userId, ...ids]
      );
    }
    const [unreadResult] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    res.json({ success: true, unread_count: unreadResult[0].count });
  } catch (err) {
    console.error('Delete notifications error:', err);
    res.status(500).json({ code: 'DELETE_ERROR', message: 'Failed to delete notifications' });
  }
});

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [unread] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    const [byCategory] = await db.query(
      `SELECT category, COUNT(*) as count
       FROM notifications WHERE user_id = ? AND is_read = FALSE
       GROUP BY category`,
      [userId]
    );
    const counts = {};
    byCategory.forEach((r) => {
      counts[r.category] = r.count;
    });
    res.json({
      success: true,
      unread_total: unread[0].count,
      by_category: counts,
    });
  } catch (err) {
    console.error('Notification summary error:', err);
    res.status(500).json({ code: 'SUMMARY_ERROR', message: 'Failed to load summary' });
  }
});

router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const prefs = require('../services/notificationPreferenceService');
    const data = await prefs.getPreferences(req.user.id);
    res.json({ success: true, preferences: data });
  } catch (err) {
    console.error('Notification preferences error:', err);
    res.status(500).json({ code: 'PREFS_ERROR', message: 'Failed to load preferences' });
  }
});

router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const prefs = require('../services/notificationPreferenceService');
    const data = await prefs.updatePreferences(req.user.id, req.body || {});
    res.json({ success: true, preferences: data });
  } catch (err) {
    console.error('Notification preferences update error:', err);
    res.status(500).json({ code: 'PREFS_UPDATE_ERROR', message: 'Failed to update preferences' });
  }
});

router.post('/push/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userAgent = req.get('user-agent') || req.body.user_agent || null;
    console.log(`[push] Subscribe request for user ${userId}`, {
      hasEndpoint: !!req.body?.endpoint,
      hasKeys: !!(req.body?.keys?.p256dh && req.body?.keys?.auth),
    });
    await subscribe(userId, req.body, userAgent);
    console.log(`[push] Subscribed user ${userId}`);
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
  const vapidPublicKey = process.env.FCM_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.FCM_VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY;
  res.json({
    supported: !!(vapidPublicKey && vapidPrivateKey),
  });
});

module.exports = router;

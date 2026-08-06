const router = require('express').Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

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
      `SELECT id, title, body, type, is_read, link, created_at FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ?`,
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

module.exports = router;

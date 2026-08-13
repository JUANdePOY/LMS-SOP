const db = require('../config/database');

async function getSubscriptions(userId) {
  const [rows] = await db.query(
    `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ? AND is_active = TRUE`,
    [userId]
  );
  return rows;
}

async function subscribe(userId, subscription, userAgent) {
  const endpoint = subscription.endpoint;
  const { p256dh, auth } = subscription.keys || subscription;
  if (!endpoint || !p256dh || !auth) {
    throw new Error('INVALID_SUBSCRIPTION');
  }

  await db.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE endpoint = VALUES(endpoint), p256dh = VALUES(p256dh), auth = VALUES(auth), user_agent = VALUES(user_agent), is_active = TRUE`,
    [userId, endpoint, p256dh, auth, userAgent || null]
  );
}

async function unsubscribe(endpoint) {
  if (!endpoint) return;
  await db.query(`UPDATE push_subscriptions SET is_active = FALSE WHERE endpoint = ?`, [endpoint]);
}

async function sendPushNotification(userId, payload) {
  const subscriptions = await getSubscriptions(userId);
  if (!subscriptions.length) {
    console.log(`[push] No active subscriptions for user ${userId}`);
    return;
  }

  console.log(`[push] Delivering to ${subscriptions.length} subscription(s) for user ${userId}: ${payload.title}`);

  const results = await Promise.allSettled(
    subscriptions.map((sub) => deliverWebPush(sub, payload))
  );

  results.forEach((result, idx) => {
    if (result.status === 'rejected') {
      const error = result.reason;
      const statusCode = error?.statusCode || error?.status || 0;
      if (statusCode === 410 || statusCode === 404) {
        unsubscribe(subscriptions[idx].endpoint).catch(() => {});
      }
      console.error(`[push] Delivery failed for user ${userId}, endpoint ${subscriptions[idx]?.endpoint}:`, error.message || error);
    } else {
      console.log(`[push] Delivered successfully to user ${userId}, endpoint ${subscriptions[idx]?.endpoint}`);
    }
  });
}

async function deliverWebPush(subscription, payload) {
  const webPush = require('web-push');

  const vapidPublicKey = process.env.FCM_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.FCM_VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@lms.example.com';

  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID_KEYS_NOT_CONFIGURED');
  }

  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  await webPush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify({
      title: payload.title || 'LMS-SOP Notification',
      body: payload.body || '',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        url: payload.link || '/notifications',
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
      },
    })
  );
}

module.exports = {
  getSubscriptions,
  subscribe,
  unsubscribe,
  sendPushNotification,
};

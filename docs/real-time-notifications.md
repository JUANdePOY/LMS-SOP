# Real-Time Push Notifications — Technical Implementation Plan

## 1. Current State Assessment

### 1.1 Existing Notification Infrastructure

| Layer | Status | Details |
|---|---|---|
| Database | ✅ Exists | `notifications` table with `user_id`, `title`, `body`, `type`, `is_read`, `link`, `entity_type`, `entity_id`, indexes on `user_id` and `is_read` |
| Backend Service | ✅ Exists | `server/services/notificationService.js` — `createNotification`, `broadcastSystemChange`, `createSystemNotification` |
| Backend REST Routes | ✅ Exists | `server/routes/notifications.js` — GET, POST, POST /broadcast, PATCH /read, PATCH /read-all |
| Frontend Store | ✅ Exists | `client/src/shared/stores/notificationStore.js` — polling every 25s via `useNotificationPoller` |
| Frontend UI | ✅ Exists | `NotificationDropdown`, `NotificationBadge`, `Notifications.jsx` page |
| Backend WebSocket Server | ❌ Missing | `ws` package in dependencies but no server implementation |
| Frontend WebSocket Client | ❌ Missing | No real-time client connection |
| Device Push (FCM/APNs) | ❌ Missing | No push notification gateway |

### 1.2 Architecture Context

- **Stack**: Node.js + Express (backend), React + Vite (frontend), MySQL (database)
- **Auth**: JWT bearer tokens via `Authorization` header
- **Existing Polling**: Frontend polls `/api/notifications` every 25s — functional but not real-time
- **Notification Producers**: Controllers for enrollments, SOPs, courses, quizzes, tasks, announcements, events, certificates already call `createSystemNotification` / `broadcastSystemChange`

---

## 2. Goals & Non-Goals

### Goals
1. Deliver notifications to the user's device in real time (< 500ms latency) when events occur
2. Reduce unnecessary API polling while preserving reliability
3. Support browser tab notifications even when the tab is backgrounded
4. Maintain backward compatibility with existing REST endpoints

### Non-Goals
1. Mobile native apps (iOS/Android) — out of scope unless requested separately
2. Email/SMS notification delivery — out of scope
3. Notification preferences UI — deferred to post-MVP
4. Rich media notifications (images, actions) — deferred

---

## 3. Architecture Design

### 3.1 High-Level Flow

```
┌──────────────┐     HTTP POST      ┌──────────────┐
│   Backend    │ ──────────────────► │  MySQL DB    │
│   Event      │                     └──────────────┘
│   Occurs     │
└──────┬───────┘
       │
       │ 1. Persist notification
       ▼
┌──────────────┐    2. Publish      ┌──────────────┐
│ notification │ ──────────────────► │   Redis      │
│   Service    │                     │   Pub/Sub    │
└──────┬───────┘                     └──────┬───────┘
       │                                     │
       │ 3. Broadcast via WS                 │ 4. Fan-out
       ▼                                     ▼
┌──────────────┐                     ┌──────────────┐
│ WebSocket    │ ──────────────────► │ WebSocket    │
│   Server     │                     │   Clients    │
│  (per-user)  │                     │  (browsers)  │
└──────────────┘                     └──────┬───────┘
                                            │
                                            │ 5. Browser Push API
                                            ▼
                                   ┌──────────────┐
                                   │  OS / Browser │
                                   │  Notification │
                                   │    Center     │
                                   └──────────────┘
```

### 3.2 Key Decisions

| Decision | Rationale |
|---|---|
| **Transport**: WebSocket + fallback to polling | `ws` already in dependencies; provides sub-second delivery with automatic HTTP fallback |
| **Auth on WS**: JWT in query string during upgrade, then validate per message | Standard pattern; avoids per-frame auth overhead while maintaining security |
| **Scoping**: One WS connection per logged-in user session | Simpler than per-tenant rooms; user receives only their notifications |
| **Fan-out**: Redis Pub/Sub for multi-instance scaling | If deploying behind a load balancer with multiple Node instances, Redis ensures all instances can broadcast |
| **Browser Push**: Web Push API (VAPID) | Standard for web apps; works across Chrome, Firefox, Edge, Safari |
| **Graceful Degradation**: Keep 25s polling as fallback | If WS disconnects or is blocked (corporate proxies), polling still works |

### 3.3 Component Map

```
server/
├── services/
│   ├── notificationService.js          (modified: add WebSocket emit)
│   └── pushNotificationService.js      (new: FCM/APNs abstraction)
├── websocket/
│   ├── server.js                       (new: WS server bootstrap)
│   ├── auth.js                         (new: JWT validation on upgrade)
│   └── clients.js                      (new: per-user client registry)
├── routes/
│   └── notifications.js                (modified: add WS endpoint)
└── server.js                           (modified: mount WS server)

client/src/
├── features/
│   └── notifications/
│       ├── api/
│       │   └── notification.api.js     (new: WS + push API functions)
│       ├── hooks/
│       │   ├── useWebSocket.js         (new: WS connection hook)
│       │   └── usePushNotifications.js (new: browser push hook)
│       └── services/
│           └── notificationRealtime.service.js (new: realtime orchestration)
├── shared/
│   ├── stores/
│   │   └── notificationStore.js        (modified: subscribe to WS events)
│   └── components/
│       └── ui/
│           └── NotificationDropdown.jsx (modified: show real-time updates)
└── services/
    └── api.js                          (unchanged: REST fallback remains)
```

---

## 4. Backend Implementation

### 4.1 WebSocket Server

**File**: `server/websocket/server.js`

```js
const WebSocket = require('ws');
const { authenticateWebSocket } = require('./auth');
const { broadcastToUser } = require('./clients');

const wss = new WebSocket.Server({ noServer: true });

function handleConnection(ws, req, userId) {
  const client = {
    ws,
    userId,
    connectedAt: Date.now(),
    lastPing: Date.now(),
  };

  client.ws.isAlive = true;
  client.ws.on('pong', () => { client.ws.isAlive = true; });
  client.ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'ping') {
        client.ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {}
  });
  client.ws.on('close', () => {
    removeClient(userId, ws);
  });

  addClient(userId, client);
}

function upgradeHandler(req, socket, head) {
  // Authenticate via JWT before upgrading
  const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token');
  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  authenticateWebSocket(token)
    .then(userId => {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req, userId);
      });
    })
    .catch(() => {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    });
}

module.exports = { wss, upgradeHandler };
```

### 4.2 Client Registry

**File**: `server/websocket/clients.js`

```js
const clients = new Map(); // userId -> Set<WebSocket>

function addClient(userId, client) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(client);
}

function removeClient(userId, ws) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) clients.delete(userId);
}

function getClientsForUser(userId) {
  return clients.get(userId) || new Set();
}

function broadcastToUser(userId, payload) {
  const set = getClientsForUser(userId);
  if (set.size === 0) return 0;
  let sent = 0;
  const data = JSON.stringify(payload);
  for (const client of set) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
      sent++;
    }
  }
  return sent;
}

module.exports = { addClient, removeClient, getClientsForUser, broadcastToUser };
```

### 4.3 Modified Notification Service

**File**: `server/services/notificationService.js`

```js
const { broadcastToUser } = require('../websocket/clients');

async function createNotification({ userId, title, body, type = 'info', link, entityType, entityId }) {
  // ... existing code ...

  const result = await db.query(
    `INSERT INTO notifications (user_id, title, body, type, link, entity_type, entity_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, String(title).slice(0, 255), body || null, type, link || null, entityType || null, entityId || null]
  );

  const notificationId = result[0]?.insertId || null;

  // Real-time push via WebSocket
  if (notificationId) {
    const sent = broadcastToUser(userId, {
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
    });

    // If WS not connected, trigger device push (FCM/APNs)
    if (sent === 0) {
      triggerDevicePush(userId, { title, body, type, link, entityType, entityId });
    }
  }

  return notificationId;
}
```

### 4.4 Push Notification Service (Device-Level)

**File**: `server/services/pushNotificationService.js`

```js
const db = require('../config/database');

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;
const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

async function getSubscriptions(userId) {
  const [rows] = await db.query(
    `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ? AND is_active = TRUE`,
    [userId]
  );
  return rows;
}

async function subscribe(userId, subscription) {
  const { endpoint, p256dh, auth } = subscription.keys;
  await db.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE endpoint = VALUES(endpoint), p256dh = VALUES(p256dh), auth = VALUES(auth), is_active = TRUE`,
    [userId, endpoint, p256dh, auth]
  );
}

async function unsubscribe(endpoint) {
  await db.query(`UPDATE push_subscriptions SET is_active = FALSE WHERE endpoint = ?`, [endpoint]);
}

async function sendPushNotification(userId, payload) {
  const subscriptions = await getSubscriptions(userId);
  if (!subscriptions.length) return;

  const results = await Promise.allSettled(
    subscriptions.map(sub => sendWebPush(sub, payload))
  );
  // Log failed deliveries for cleanup
  results.forEach((result, idx) => {
    if (result.status === 'rejected') {
      console.error(`Push delivery failed for user ${userId}:`, result.reason.message);
      // In production, mark subscription as inactive if endpoint returns 404
    }
  });
}

module.exports = { subscribe, unsubscribe, sendPushNotification, getSubscriptions };
```

### 4.5 Server Mount

**File**: `server/server.js`

```js
const { upgradeHandler } = require('./websocket/server');
const { wss } = require('./websocket/server');

// Add WebSocket upgrade path
const WebSocket = require('ws');
const server = app.listen(PORT, () => {
  console.log(`LMS-SOP Server running on port ${PORT}`);
});

server.on('upgrade', upgradeHandler);

// Heartbeat: ping clients every 30s
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('connection', (ws, req, userId) => {
  handleConnection(ws, req, userId);
});

server.on('close', () => {
  clearInterval(heartbeatInterval);
});
```

### 4.6 Database Migration

**File**: `server/migrations/002_push_subscriptions.sql`

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  user_agent TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_push_subscriptions_user (user_id),
  INDEX idx_push_subscriptions_endpoint (endpoint(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 5. Frontend Implementation

### 5.1 WebSocket Hook

**File**: `client/src/features/notifications/hooks/useWebSocket.js`

```js
import { useEffect, useRef, useCallback } from 'react';
import { useNotificationStore } from '@/shared/stores/notificationStore.js';

const WS_URL = (import.meta.env.VITE_WS_URL || '').replace(/^http/, 'ws');

export function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectAttempts = useRef(0);
  const { refresh } = useNotificationStore();
  const tokenRef = useRef(null);

  const connect = useCallback(() => {
    const token = tokenRef.current;
    if (!token) return;

    const url = `${WS_URL}/api/notifications/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'notification' && msg.action === 'created') {
          refresh();
        }
      } catch {}
    };

    ws.onclose = () => {
      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
      reconnectTimer.current = setTimeout(() => {
        reconnectAttempts.current++;
        connect();
      }, delay);
    };

    ws.onerror = () => ws.close();
  }, [refresh]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    tokenRef.current = token;
    connect();

    const onStorage = (e) => {
      if (e.key === 'access_token') {
        if (wsRef.current) wsRef.current.close();
        tokenRef.current = e.newValue;
        if (e.newValue) connect();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && wsRef.current?.readyState === WebSocket.CLOSED) {
        connect();
      }
    };

    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
```

### 5.2 Browser Push Hook

**File**: `client/src/features/notifications/hooks/usePushNotifications.js`

```js
import { useEffect, useState, useCallback } from 'react';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function usePushNotifications() {
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);

  const requestPermission = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications not supported');
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      setSubscription(sub);

      // Send subscription to backend
      const token = localStorage.getItem('access_token');
      await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sub),
      });

      return sub;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    await subscription.unsubscribe();
    setSubscription(null);
    setPermission('default');

    const token = localStorage.getItem('access_token');
    await fetch('/api/notifications/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  }, [subscription]);

  return { permission, subscription, requestPermission, unsubscribe };
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

### 5.3 Service Worker

**File**: `public/sw.js`

```js
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'LMS-SOP Notification';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: { url: data.link || '/notifications' },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
```

### 5.4 Service Worker Registration

**File**: `client/src/main.jsx` (append)

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}
```

### 5.5 Push Subscription API Routes

**File**: `server/routes/notifications.js` (append)

```js
const { subscribe, unsubscribe, sendPushNotification } = require('../services/pushNotificationService');

router.post('/push/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await subscribe(userId, req.body);
    res.json({ success: true });
  } catch {
    res.status(500).json({ code: 'PUSH_SUBSCRIBE_ERROR', message: 'Failed to save push subscription' });
  }
});

router.post('/push/unsubscribe', authenticateToken, async (req, res) => {
  try {
    await unsubscribe(req.body.endpoint);
    res.json({ success: true });
  } catch {
    res.status(500).json({ code: 'PUSH_UNSUBSCRIBE_ERROR', message: 'Failed to remove push subscription' });
  }
});

router.get('/push/check', authenticateToken, (req, res) => {
  res.json({ supported: 'serviceWorker' in navigator && 'PushManager' in window });
});
```

### 5.6 Modified Notification Store

**File**: `client/src/shared/stores/notificationStore.js`

```js
import { useWebSocket } from '@/features/notifications/hooks/useWebSocket';

function computeSnapshot() {
  return {
    dismissed,
    serverNotifications,
    unreadServerCount,
    unreadMessageCount,
    pendingBanners,
    wsConnected: false, // will be updated by hook
  };
}

let wsConnected = false;

// In the store:
setWsConnected(connected) {
  wsConnected = connected;
  emitChange();
}

// In AppLayout or a top-level hook, subscribe to WS:
const { send } = useWebSocket();
// wsConnected is now available in the store snapshot
```

### 5.7 Settings Page Integration

**File**: `client/src/pages/Settings.jsx` (add Push section)

```jsx
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';

function PushNotificationsSection() {
  const { permission, requestPermission, unsubscribe } = usePushNotifications();

  return (
    <div className="rounded-xl border p-6">
      <h3 className="text-lg font-semibold">Browser Push Notifications</h3>
      <p className="text-sm text-neutral-500 mt-1">
        Receive notifications even when the app is closed.
      </p>
      {permission === 'granted' ? (
        <button onClick={unsubscribe} className="mt-4 ...">
          Disable Push Notifications
        </button>
      ) : (
        <button onClick={requestPermission} className="mt-4 ...">
          Enable Push Notifications
        </button>
      )}
    </div>
  );
}
```

---

## 6. Security & Reliability

### 6.1 WebSocket Security

| Concern | Mitigation |
|---|---|
| Unauthenticated connections | JWT validated during upgrade handshake; reject with 401 before accepting |
| Token replay | Same JWT used for HTTP; standard expiry applies |
| Message injection | All WS messages are JSON-parsed with try/catch; only `{type, action, data}` schema accepted |
| DoS / Flooding | `express-rate-limit` on HTTP fallback; WS ping/pong timeout (30s); max 100 WS per user |
| Cross-origin WS | Only allow origins from `CORS_ORIGINS`; check `req.headers.origin` during upgrade |

### 6.2 Push Notification Security

| Concern | Mitigation |
|---|---|
| Subscription hijacking | `endpoint` URL is user-specific (includes unique auth key); validate JWT before allowing subscription save |
| VAPID key exposure | Public key is safe to expose in frontend; private key stays in `FCM_VAPID_PRIVATE_KEY` env var |
| Spam / Abuse | Rate limit push sends per user; deduplicate via existing `DEDUP_WINDOW_MS` |

### 6.3 Graceful Degradation

```
Browser supports WebSocket?       → Use WS real-time
Browser supports Push API?        → Offer browser push
Neither? / WS blocked by proxy?   → Fall back to 25s polling (already implemented)
Backend down?                     → Queue in DB; deliver on reconnect
```

### 6.4 Error Handling

- **WS disconnect**: Auto-reconnect with exponential backoff (1s → 2s → 4s → ... → 30s cap)
- **Push delivery failure**: Log and mark subscription as inactive; remove from DB after 3 consecutive failures
- **Service worker registration failure**: Silent fallback to in-app notifications only
- **DB write failure on notification**: Return 500; existing controllers already handle this

---

## 7. Testing Strategy

### 7.1 Backend Tests

| Test | Command | Assertion |
|---|---|---|
| WS auth rejects missing token | Connect without `?token=` | Connection closed with 401 |
| WS auth accepts valid JWT | Connect with valid token | `connection` event fires with userId |
| WS broadcasts to single user | Create notification via service | `broadcastToUser` sends JSON with correct payload |
| WS broadcasts on enrollment | POST `/api/enrollments` | New notification appears in WS message |
| Push subscription saved | POST `/api/notifications/push/subscribe` | Row exists in `push_subscriptions` |
| Push unsubscribed | POST `/api/notifications/push/unsubscribe` | Row `is_active = FALSE` |

### 7.2 Frontend Tests

| Test | Assertion |
|---|---|
| `useWebSocket` connects on mount | `wsRef.current.readyState === WebSocket.OPEN` |
| `useWebSocket` reconnects on close | Reconnect count increments, new connection opens |
| Incoming WS message updates store | `notificationStore.unreadServerCount` increases |
| Service worker shows notification | `self.registration.showNotification` called with correct title |
| Notification click navigates | Client focuses or opens `/notifications` |

### 7.3 E2E / Manual Verification

1. Open app in two browser tabs (different users)
2. User A enrolls User B in a course
3. Verify User B sees notification within 1s in Tab 2 (WS)
4. Close Tab 2, send push from server console
5. Verify OS notification center shows the alert (Push API)
6. Block WebSocket in DevTools → verify polling fallback works

---

## 8. Deployment Considerations

### 8.1 Environment Variables

```env
# Server
JWT_SECRET=<existing>
PORT=5000

# WebSocket
WS_PATH=/api/notifications/ws
WS_PING_INTERVAL_MS=30000
WS_PING_TIMEOUT_MS=5000

# Push Notifications (VAPID / FCM)
FCM_VAPID_PUBLIC_KEY=<base64 encoded>
FCM_VAPID_PRIVATE_KEY=<base64 encoded>
FCM_SERVER_KEY=<optional: for FCM legacy API>
VAPID_SUBJECT=mailto:admin@example.com
```

### 8.2 Hostinger Deployment

- Hostinger may not support raw WebSocket upgrades on all plans
- **Workaround**: If WS is blocked, the 25s polling fallback ensures functionality
- Add `ws` path to CORS allowed routes
- Ensure `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "upgrade";` are in nginx config if using reverse proxy

### 8.3 Vercel Deployment

- Vercel serverless functions do not support persistent WebSocket connections
- **Mitigation**: Use polling on Vercel; deploy backend to a VPS / Railway / Render for WS support
- Or use a managed WebSocket service (Pusher, Ably) as a transport layer

### 8.4 Scaling to Multiple Instances

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  Node 1    │     │  Node 2    │     │  Node 3    │
│  WS Server │     │  WS Server │     │  WS Server │
└─────┬──────┘     └─────┬──────┘     └─────┬──────┘
      │                  │                  │
      └──────────────────┼──────────────────┘
                         │
                  ┌──────▼──────┐
                  │    Redis    │
                  │  Pub/Sub    │
                  └─────────────┘
```

- When notification is created on any node, publish to Redis channel `notifications`
- All nodes subscribe and call `broadcastToUser` for connected clients on that node
- This ensures a user connected to Node 1 receives notifications even if the event was created on Node 2

---

## 9. Implementation Phases

### Phase 1: WebSocket Foundation (Week 1)
- [ ] Create `server/websocket/` module (server, auth, clients)
- [ ] Mount WS server in `server.js`
- [ ] Modify `notificationService.js` to broadcast on create
- [ ] Add ping/pong heartbeat
- [ ] Write unit tests for WS auth and broadcast

### Phase 2: Frontend Real-Time (Week 1-2)
- [ ] Create `useWebSocket` hook
- [ ] Integrate into `NotificationStore.js`
- [ ] Verify `NotificationDropdown` updates without polling
- [ ] Add reconnection logic with exponential backoff
- [ ] Test WS disconnect/reconnect scenarios

### Phase 3: Browser Push Notifications (Week 2)
- [ ] Generate VAPID keys
- [ ] Add `pushNotificationService.js` on backend
- [ ] Add push subscription routes
- [ ] Create `sw.js` service worker
- [ ] Create `usePushNotifications` hook
- [ ] Add UI in Settings
- [ ] Test on Chrome, Firefox, Edge, Safari

### Phase 4: Scaling & Hardening (Week 3)
- [ ] Add Redis Pub/Sub for multi-instance
- [ ] Implement push delivery retry + cleanup
- [ ] Add rate limiting on WS messages
- [ ] Add metrics: WS connections count, push delivery rate, latency
- [ ] Load test with 1000 concurrent WS connections

### Phase 5: Monitoring & Rollout (Week 3-4)
- [ ] Add health check: `/api/health/notifications` (WS + push status)
- [ ] Add dashboard for push delivery metrics
- [ ] Feature flag: `ENABLE_WS_NOTIFICATIONS` (default: true)
- [ ] Gradual rollout: enable for 10% → 50% → 100%
- [ ] Monitor error rates, latency, and user engagement

---

## 10. Fallback Strategy

| Failure Mode | Detection | Fallback |
|---|---|---|
| WS server crashes | Health check fails | Polling continues; users still get notifications |
| Redis down | Pub/Sub error logged | WS still works for single instance; multi-instance uses local broadcast |
| Push service down (FCM) | 5xx from FCM | Queue in `push_deliveries` table; retry on next event |
| Service worker unregistered | `navigator.serviceWorker.ready` rejects | Show in-app notifications only |
| Browser blocks notifications | Permission denied | UI shows "Enable notifications" prompt in Settings |

---

## 11. Success Metrics

| Metric | Target |
|---|---|
| WS connection success rate | > 99.5% |
| End-to-end notification latency (WS) | < 500ms p95 |
| End-to-end notification latency (Push) | < 2s p95 |
| Polling reduction | > 80% (polling only on reconnect) |
| Push opt-in rate | > 30% of active users |
| Notification open rate | > 15% |
| False positive / duplicate rate | < 1% (existing dedup window handles this) |

---

## 12. Open Questions

1. **Should we support per-notification preferences?** (e.g., mute course notifications) — defer to post-MVP
2. **Do we need notification sound customization?** — defer
3. **Should admins be able to push to specific departments?** — yes, via existing `broadcastSystemChange` with `user_ids` array
4. **VAPID subject format**: `mailto:` vs `https://` — prefer `mailto:admin@lms.example.com`
5. **Redis required?** — only if scaling beyond one Node instance; for single-instance, skip Redis

---

## 13. Files to Create / Modify

### New Files
```
server/websocket/server.js
server/websocket/auth.js
server/websocket/clients.js
server/services/pushNotificationService.js
server/migrations/002_push_subscriptions.sql
client/src/features/notifications/api/notification.api.js
client/src/features/notifications/hooks/useWebSocket.js
client/src/features/notifications/hooks/usePushNotifications.js
client/src/features/notifications/services/notificationRealtime.service.js
public/sw.js
docs/real-time-notifications.md
```

### Modified Files
```
server/services/notificationService.js   (+ WS broadcast, + device push trigger)
server/routes/notifications.js           (+ push subscribe/unsubscribe routes)
server/server.js                         (+ WS mount, heartbeat)
client/src/shared/stores/notificationStore.js  (+ WS event subscription)
client/src/App.jsx                       (+ SW registration, optional)
client/src/pages/Settings.jsx            (+ Push Notifications section)
package.json (server)                    (+ web-push dependency)
```

---

*Plan version: 1.0*
*Date: 2026-08-13*
*Author: Kilo*

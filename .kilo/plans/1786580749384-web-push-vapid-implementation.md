# Web Push VAPID Implementation Plan

## Current State Assessment

The codebase already has substantial push notification infrastructure:
- Backend: `web-push` library, VAPID keys in env, `pushNotificationService.js`, routes, migration
- Frontend: `usePushNotifications` hook, `sw.js` service worker, Settings UI (`PushNotificationsSection`)
- Delivery: WebSocket primary + Web Push fallback when WS has 0 connected clients

## What's Already Working (Do NOT Rebuild)

- `server/services/pushNotificationService.js` — VAPID delivery via `web-push`
- `server/routes/notifications.js` — `/push/subscribe`, `/push/unsubscribe`, `/push/check`
- `client/src/features/notifications/hooks/usePushNotifications.js` — subscribe/unsubscribe hook
- `client/public/sw.js` — handles `push` and `notificationclick` events
- `client/src/pages/Settings.jsx` — `PushNotificationsSection` UI already exists
- `server/migrations/pushNotifications.js` — `push_subscriptions` table
- VAPID keys already in `server/.env` and client `.env` files

## What Needs to Be Fixed/Completed

### 1. Fix `/push/check` endpoint (server/routes/notifications.js:237)
**Bug:** `typeof window !== 'undefined'` always returns `false` on the server, so the endpoint always reports push as unsupported.
**Fix:** Return `true` when `web-push` is configured and VAPID keys exist.

### 2. Add VAPID key validation on server startup (server/server.js)
**Gap:** If VAPID keys are missing, push delivery fails silently. The server should fail fast.
**Fix:** Add a boot-time check that validates `FCM_VAPID_PUBLIC_KEY` and `FCM_VAPID_PRIVATE_KEY` are set and non-empty.

### 3. Store `user_agent` on subscription (server/services/pushNotificationService.js)
**Gap:** The `push_subscriptions` table has a `user_agent` column, but `subscribe()` never populates it.
**Fix:** Accept and store `user_agent` from the request body.

### 4. Clean up invalid/expired subscriptions (server/services/pushNotificationService.js)
**Gap:** When `web-push.sendNotification` throws (410 Gone = subscription expired), the subscription stays active in DB forever.
**Fix:** On delivery failure with 410 status, mark subscription as inactive or delete it.

### 5. Unsubscribe on logout (client/src/contexts/AuthContext.jsx)
**Gap:** When user logs out, push subscriptions remain in DB tied to that user.
**Fix:** Call `/api/notifications/push/unsubscribe` on logout.

### 6. Add toast feedback for push actions (client/src/pages/Settings.jsx)
**Gap:** Enabling/disabling push gives no user feedback.
**Fix:** Use `useToast` to show success/error messages in `PushNotificationsSection`.

### 7. Verify end-to-end flow
- Generate VAPID keys: `npx web-push generate-vapid-keys`
- Run server, open app, go to Settings → enable push
- Trigger a notification (e.g., create SOP, broadcast announcement)
- Confirm OS-level notification appears even when tab is backgrounded

## Out of Scope (Do NOT Implement)

- Firebase FCM / OneSignal / third-party push services
- Mobile native push (iOS/Android SDKs)
- Email/SMS notifications
- Desktop app wrapper (Tauri/Electron)
- Redis for multi-instance WS scaling
- Rich media notifications (images/actions beyond basic title+body)
- Push notification scheduling
- Notification preferences per category

## Files to Modify

| File | Change |
|------|--------|
| `server/routes/notifications.js` | Fix `/push/check` endpoint |
| `server/server.js` | Add VAPID key validation on boot |
| `server/services/pushNotificationService.js` | Store `user_agent`, cleanup invalid subscriptions |
| `client/src/contexts/AuthContext.jsx` | Unsubscribe push on logout |
| `client/src/pages/Settings.jsx` | Add toast feedback |

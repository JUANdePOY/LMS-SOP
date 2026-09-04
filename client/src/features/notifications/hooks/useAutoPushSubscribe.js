import { useEffect } from 'react';
import * as session from '@/services/session';
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';

/**
 * Automatically subscribes every logged-in user to web push on first load,
 * unless they have explicitly disabled it in their notification preferences.
 *
 * Push is currently opt-in only (Settings / NotificationPreferences), so most
 * users — especially employees — never subscribed and therefore received no
 * push notifications outside the app. This hook makes push opt-out instead of
 * opt-in: it asks for permission and subscribes once, then never again unless
 * the user unsubscribes or disables the channel in preferences.
 *
 * Safety guards:
 *   - Only runs when the browser supports service worker + PushManager.
 *   - Skips when the user's preferences have push explicitly disabled.
 *   - Skips when the user has already been subscribed (idempotent on reload).
 *   - Never throws — a denied/failed permission is a no-op, not an error.
 */
export function useAutoPushSubscribe() {
  const {
    isSupported,
    permission,
    subscription,
    requestPermission,
  } = usePushNotifications();

  useEffect(() => {
    if (!isSupported) return;
    if (!session.getCurrentToken()) return;
    // Already subscribed — nothing to do.
    if (subscription) return;
    // Browser already denied: don't nag again.
    if (permission === 'denied') return;

    let active = true;
    (async () => {
      try {
        // Respect the user's own push-channel preference if it has been set.
        let pushEnabled = true;
        try {
          const res = await fetch('/api/notifications/preferences', {
            headers: { Authorization: `Bearer ${session.getCurrentToken()}` },
          });
          const data = await res.json();
          const channels = data?.preferences?.channels;
          if (channels && typeof channels.push === 'boolean') {
            pushEnabled = channels.push;
          }
        } catch {
          // Preferences lookup failed — default to enabling push.
        }
        if (!pushEnabled || !active) return;

        await requestPermission();
      } catch {
        // Permission denied or subscription failed — silently ignore. The
        // in-app notification + banner still deliver; only the outside-app
        // push is skipped.
      }
    })();

    return () => { active = false; };
    // Intentionally depends on the primitive values, not the stable
    // requestPermission identity, so a denied permission stops re-prompting.
  }, [isSupported, permission, subscription, requestPermission]);
}

export default useAutoPushSubscribe;
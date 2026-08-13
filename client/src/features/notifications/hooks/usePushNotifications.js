import { useEffect, useState, useCallback } from 'react';
import * as session from '@/services/session';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log('[push] Hook mounted, browser support:', 'serviceWorker' in navigator && 'PushManager' in window);

  const checkExisting = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[push] Push not supported in this browser');
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      console.log('[push] Service worker ready on check:', reg.scope);
      const sub = await reg.pushManager.getSubscription();
      console.log('[push] Existing subscription:', sub?.endpoint || 'none');
      setSubscription(sub);
      setPermission(Notification.permission);
      return sub;
    } catch (err) {
      console.log('[push] Check existing error:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    checkExisting();
  }, [checkExisting]);

  const requestPermission = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      const err = new Error('Push notifications not supported in this browser');
      setError(err.message);
      throw err;
    }

    if (!VAPID_PUBLIC_KEY) {
      const err = new Error('VAPID public key not configured');
      setError(err.message);
      throw err;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        const message = result === 'denied'
          ? 'Notification permission was denied. Please reset it in your browser site settings and try again.'
          : 'Notification permission was not granted.';
        const err = new Error(message);
        setError(message);
        throw err;
      }

      const reg = await navigator.serviceWorker.ready;
      console.log('[push] Service worker ready:', reg.scope);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log('[push] Subscription created:', sub.endpoint);
      setSubscription(sub);

      const token = session.getCurrentToken();
      if (token) {
        const payload = sub.toJSON ? sub.toJSON() : sub;
        const response = await fetch('/api/notifications/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...payload,
            user_agent: navigator.userAgent,
          }),
        });
        const data = await response.json();
        console.log('[push] Subscribe response:', response.status, data);
        if (!response.ok || !data.success) {
          const err = new Error(data.message || 'Failed to save push subscription');
          setError(err.message);
          throw err;
        }
      } else {
        console.log('[push] Subscribe skipped: no auth token');
      }

      return sub;
    } catch (err) {
      const message = err?.message || 'Failed to enable push notifications';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    const currentSubscription = subscription;
    if (!currentSubscription) {
      console.log('[push] Unsubscribe skipped: no subscription object');
      setPermission('default');
      setSubscription(null);
      return;
    }

    setLoading(true);
    setError(null);

    let browserUnsubscribed = false;
    let backendRemoved = false;

    try {
      await currentSubscription.unsubscribe();
      browserUnsubscribed = true;
      console.log('[push] Browser unsubscribed:', currentSubscription.endpoint);
    } catch (err) {
      console.log('[push] Browser unsubscribe failed:', err);
      setError('Browser unsubscribe failed. Trying to clean up server-side anyway.');
    }

    try {
      const token = session.getCurrentToken();
      if (token) {
        const response = await fetch('/api/notifications/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint: currentSubscription.endpoint }),
        });
        const data = await response.json();
        console.log('[push] Unsubscribe response:', response.status, data);
        backendRemoved = response.ok && data.success;
        if (!backendRemoved) {
          const err = new Error(data.message || 'Failed to remove push subscription');
          setError(err.message);
          throw err;
        }
      } else {
        console.log('[push] Unsubscribe skipped: no auth token');
      }
    } catch (err) {
      const message = err?.message || 'Failed to disable push notifications';
      setError(message);
      throw err;
    } finally {
      if (browserUnsubscribed || backendRemoved) {
        setSubscription(null);
        setPermission('default');
      }
      setLoading(false);
    }
  }, [subscription]);

  return {
    permission,
    subscription,
    loading,
    error,
    requestPermission,
    unsubscribe,
    isSupported: 'serviceWorker' in navigator && 'PushManager' in window,
  };
}

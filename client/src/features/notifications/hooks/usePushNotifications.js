import { useEffect, useState, useCallback } from 'react';

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

  const checkExisting = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscription(sub);
      setPermission(Notification.permission);
      return sub;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    checkExisting();
  }, [checkExisting]);

  const requestPermission = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications not supported in this browser');
    }

    if (!VAPID_PUBLIC_KEY) {
      throw new Error('VAPID public key not configured');
    }

    setLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        throw new Error('Notification permission denied');
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      setSubscription(sub);

      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch('/api/notifications/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(sub),
        });
      }

      return sub;
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;

    setLoading(true);
    try {
      await subscription.unsubscribe();
      setSubscription(null);
      setPermission('default');

      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch('/api/notifications/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  return {
    permission,
    subscription,
    loading,
    requestPermission,
    unsubscribe,
    isSupported: 'serviceWorker' in navigator && 'PushManager' in window,
  };
}

import { useEffect, useRef, useCallback } from 'react';
import { NotificationStore } from '@/shared/stores/notificationStore.js';
import { playNotificationSound } from '@/shared/utils/notificationSound.js';

const WS_URL = (import.meta.env.VITE_WS_URL || '').replace(/^http/, 'ws');

export function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const tokenRef = useRef(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(() => {
    NotificationStore.refresh();
  }, []);

  const connect = useCallback(() => {
    const token = tokenRef.current;
    if (!token || !mountedRef.current) return;

    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    let url;
    try {
      url = `${WS_URL}/api/notifications/ws?token=${encodeURIComponent(token)}`;
    } catch {
      return;
    }

    let ws;
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'notification' && (msg.action === 'created' || msg.action === 'updated')) {
          playNotificationSound();
          refresh();
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!mountedRef.current) return;

      const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectAttemptsRef.current++;
        connect();
      }, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [refresh]);

  useEffect(() => {
    mountedRef.current = true;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    tokenRef.current = token;
    connect();

    const onStorage = (event) => {
      if (event.key === 'access_token') {
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        tokenRef.current = event.newValue;
        if (event.newValue) {
          reconnectAttemptsRef.current = 0;
          connect();
        }
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)) {
        reconnectAttemptsRef.current = 0;
        connect();
      }
    };

    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
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

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useAuditLogs(sopId) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!sopId || !isAuthenticated) {
      setLogs([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/sops/${sopId}/audit`);
      const payload = response.data;
      const list = payload?.data || [];
      const normalized = Array.isArray(list) ? list : [];
      setLogs(normalized);
      return normalized;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load audit logs'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, sopId]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !sopId) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh, sopId]);

  return { logs, loading, error, refresh };
}

export default useAuditLogs;


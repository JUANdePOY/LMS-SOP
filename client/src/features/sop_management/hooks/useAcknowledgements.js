import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  acknowledgeSop as acknowledgeSopRequest,
  addAcknowledgement,
  fetchAcknowledgementStats,
  fetchAcknowledgements,
} from '../services/acknowledgement.service';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useAcknowledgements(sopId) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [stats, setStats] = useState({ total: 0, acknowledged: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!sopId || !isAuthenticated) {
      setAcknowledgements([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const list = await fetchAcknowledgements(sopId);
      const normalized = Array.isArray(list) ? list : [];
      setAcknowledgements(normalized);

      try {
        const statsData = await fetchAcknowledgementStats(sopId);
        if (statsData) {
          setStats({
            total: Number(statsData.total) || 0,
            acknowledged: Number(statsData.acknowledged) || 0,
            pending: Number(statsData.pending) || 0,
          });
        }
      } catch {
        // stats are non-critical
      }

      return normalized;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load acknowledgements'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, sopId]);

  const acknowledge = useCallback(async () => {
    if (!sopId) return;
    setSaving(true);
    setError(null);
    try {
      const result = await acknowledgeSopRequest(sopId);
      await refresh();
      return result;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to acknowledge SOP'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sopId, refresh]);

  const createForUser = useCallback(async (userId, status = 'Pending') => {
    setSaving(true);
    setError(null);
    try {
      const created = await addAcknowledgement(sopId, userId, status);
      setAcknowledgements((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create acknowledgement'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sopId]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !sopId) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh, sopId]);

  return {
    acknowledgements,
    stats,
    loading,
    saving,
    error,
    refresh,
    acknowledge,
    createForUser,
  };
}

export default useAcknowledgements;


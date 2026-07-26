import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSop, updateSop } from '../api/sop.api';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useSOPDetails(id) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [sop, setSop] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!id || !isAuthenticated) return null;
    setLoading(true);
    setError(null);

    try {
      const response = await getSop(id);
      const payload = response.data;
      const item = payload?.data || payload;
      setSop(item);
      return item;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load SOP details'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated]);

  const update = useCallback(async (data) => {
    const response = await updateSop(id, data);
    const payload = response.data;
    const updated = payload?.data || payload;
    setSop((prev) => (prev ? { ...prev, ...updated } : prev));
    return updated;
  }, [id]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh]);

  return { sop, loading, error, refresh, update };
}

export default useSOPDetails;

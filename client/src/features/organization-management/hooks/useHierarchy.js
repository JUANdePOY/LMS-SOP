import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrganizationHierarchy } from '../api/hierarchy.api';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useHierarchy() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return [];
    setLoading(true);
    setError(null);
    try {
      const response = await getOrganizationHierarchy();
      const payload = response.data;
      const data = Array.isArray(payload?.data) ? payload.data : [];
      setHierarchy(data);
      return data;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load hierarchy'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh]);

  return { hierarchy, loading, error, refresh };
}

export default useHierarchy;


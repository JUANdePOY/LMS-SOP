import { useState, useEffect, useCallback } from 'react';
import { getAdminDashboard } from '@/services/api';

export default function useAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminDashboard();
      const payload = res?.data;
      if (!payload || payload.success === false) {
        throw new Error(payload?.message || 'Failed to load dashboard');
      }
      setData(payload.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refetch: fetchDashboard };
}

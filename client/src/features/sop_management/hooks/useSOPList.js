import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createSop, deleteSop, getSops } from '../api/sop.api';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useSOPList(initialParams = {}) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const initialParamsRef = useRef(initialParams);
  initialParamsRef.current = initialParams;

  const refresh = useCallback(async (params = initialParamsRef.current) => {
    if (!isAuthenticated) {
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getSops(params);
      const payload = response.data;
      const list = payload?.data?.items || payload?.data?.rows || payload?.data || [];
      const meta = payload?.data?.pagination || payload?.pagination || {};

      setSops(Array.isArray(list) ? list : []);
      setPagination({ page: meta.page || 1, limit: meta.limit || 20, total: meta.total || list.length });
      return list;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load SOPs'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const create = useCallback(async (data) => {
    const response = await createSop(data);
    const payload = response.data;
    const created = payload?.data || payload;
    if (payload?.status === 'success') {
      setSops((prev) => [created, ...prev]);
    }
    return created;
  }, []);

  const remove = useCallback(async (id) => {
    await deleteSop(id);
    setSops((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh]);

  return { sops, loading, error, pagination, refresh, create, remove };
}

export default useSOPList;
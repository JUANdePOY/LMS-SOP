import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createSop, deleteSop, getSops } from '../api/sop.api';

// Module-level constant so the default param has a stable reference across
// renders. Previously this was `initialParams = {}` in the function
// signature, which created a brand-new object on every render, which
// recreated `refresh`, which re-fired the effect below, which called
// setState, which caused another render — an infinite fetch loop.
const EMPTY_PARAMS = {};

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useSOPList(initialParams = EMPTY_PARAMS) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const refresh = useCallback(async (params = initialParams) => {
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
  }, [initialParams, isAuthenticated]);

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
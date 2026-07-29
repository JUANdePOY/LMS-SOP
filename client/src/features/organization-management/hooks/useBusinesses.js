import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinesses, createBusiness, updateBusiness, deleteBusiness } from '../api/business.api';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useBusinesses(initialParams = {}) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });

  const initialParamsRef = useRef(initialParams);
  initialParamsRef.current = initialParams;

  const refresh = useCallback(async (params = initialParamsRef.current) => {
    if (!isAuthenticated) return [];
    setLoading(true);
    setError(null);
    try {
      const response = await getBusinesses(params);
      const payload = response.data;
      const list = payload?.data?.rows || payload?.data || [];
      const meta = payload?.data || {};
      setBusinesses(Array.isArray(list) ? list : []);
      setPagination({ page: meta.page || 1, limit: meta.limit || 50, total: meta.total || list.length });
      return list;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load businesses'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const create = useCallback(async (data) => {
    const response = await createBusiness(data);
    const payload = response.data;
    const created = payload?.data || payload;
    if (payload?.status === 'success') {
      setBusinesses((prev) => [created, ...prev]);
    }
    return created;
  }, []);

  const update = useCallback(async (id, data) => {
    const response = await updateBusiness(id, data);
    const payload = response.data;
    if (payload?.status === 'success') {
      setBusinesses((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)));
    }
    return payload;
  }, []);

  const remove = useCallback(async (id) => {
    await deleteBusiness(id);
    setBusinesses((prev) => prev.filter((b) => b.id !== id));
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh]);

  return { businesses, loading, error, pagination, refresh, create, update, remove };
}

export default useBusinesses;


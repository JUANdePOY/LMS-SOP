import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../api/department.api';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useDepartments(initialParams = {}) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [departments, setDepartments] = useState([]);
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
      const response = await getDepartments(params);
      const payload = response.data;
      const list = payload?.data?.rows || payload?.data || [];
      const meta = payload?.data || {};
      setDepartments(Array.isArray(list) ? list : []);
      setPagination({ page: meta.page || 1, limit: meta.limit || 50, total: meta.total || list.length });
      return list;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load departments'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const create = useCallback(async (data) => {
    const response = await createDepartment(data);
    const payload = response.data;
    const created = payload?.data || payload;
    if (payload?.status === 'success') {
      setDepartments((prev) => [created, ...prev]);
    }
    return created;
  }, []);

  const update = useCallback(async (id, data) => {
    const response = await updateDepartment(id, data);
    const payload = response.data;
    if (payload?.status === 'success') {
      setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
    }
    return payload;
  }, []);

  const remove = useCallback(async (id) => {
    await deleteDepartment(id);
    setDepartments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh]);

  return { departments, loading, error, pagination, refresh, create, update, remove };
}

export default useDepartments;


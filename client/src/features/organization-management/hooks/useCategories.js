import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/category.api';
import { validatePagination, sanitizeSearchQuery } from '../utils/validation';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useCategories(initialParams = {}) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState([]);
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
      const { valid, errors, sanitized } = validatePagination(params);
      if (!valid) {
        console.warn('Invalid pagination params:', errors);
      }
      const query = params.query ? sanitizeSearchQuery(params.query) : '';
      const response = await getCategories({ ...sanitized, query, ...params });
      const payload = response.data;
      const list = payload?.data?.rows || payload?.data || [];
      const meta = payload?.data || {};
      setCategories(Array.isArray(list) ? list : []);
      setPagination({ page: meta.page || 1, limit: meta.limit || 50, total: meta.total || list.length });
      return list;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load categories'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const create = useCallback(async (data) => {
    const response = await createCategory(data);
    const payload = response.data;
    if (payload?.status === 'success') {
      await refresh();
    }
    return payload?.data || payload;
  }, [refresh]);

  const update = useCallback(async (id, data) => {
    const response = await updateCategory(id, data);
    const payload = response.data;
    if (payload?.status === 'success') {
      await refresh();
    }
    return payload;
  }, [refresh]);

  const remove = useCallback(async (id) => {
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh]);

  return { categories, loading, error, pagination, refresh, create, update, remove };
}

export default useCategories;
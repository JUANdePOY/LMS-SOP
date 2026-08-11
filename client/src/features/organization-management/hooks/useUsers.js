import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUsers } from '../api/users.api';
import { validatePagination, sanitizeSearchQuery } from '../utils/validation';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useUsers(initialParams = {}) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const initialParamsRef = useRef(initialParams);
  initialParamsRef.current = initialParams;

  const refresh = useCallback(async (params = initialParamsRef.current) => {
    if (!isAuthenticated) return [];
    setLoading(true);
    setError(null);
    try {
      const { sanitized } = validatePagination(params);
      const query = params.query ? sanitizeSearchQuery(params.query) : '';
      const response = await getUsers({ ...params, ...sanitized, query });
      const payload = response.data;
      const list = payload?.data?.rows || payload?.data || [];
      setUsers(Array.isArray(list) ? list : []);
      return list;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load users'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh]);

  return { users, loading, error, refresh };
}

export default useUsers;

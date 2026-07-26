import { useState, useEffect, useCallback } from 'react';
import { getDepartments } from '@/services/api';

export function useDepartmentList() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDepartments({ limit: 200 });
      // getDepartments returns axios response: { data: { status, data: { rows, ... } } }
      const serverData = response?.data?.data;
      const list = serverData?.rows ?? serverData ?? [];
      setDepartments(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { departments, loading, error, refetch: fetch };
}

export default useDepartmentList;


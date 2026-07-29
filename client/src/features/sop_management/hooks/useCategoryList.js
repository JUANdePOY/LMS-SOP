import { useState, useEffect, useCallback } from 'react';
import { getCategories } from '@/services/api';

export function useCategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCategories({ limit: 200 });
      const serverData = response?.data?.data;
      const list = serverData?.rows ?? serverData ?? [];
      setCategories(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { categories, loading, error, refetch: fetch };
}

export default useCategoryList;
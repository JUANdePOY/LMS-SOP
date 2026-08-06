import { useState, useCallback } from 'react';
import { getMyTaskCount } from '../services/taskService';

export function useMyTaskCount() {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyTaskCount();
      setCount(data?.count ?? 0);
    } catch (err) {
      setError(err.message || 'Failed to load task count');
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return { count, loading, error, refresh };
}

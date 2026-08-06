import { useState, useCallback, useRef } from 'react';
import { getMyTasks } from '../services/taskService';

export function useMyTasks(filters = {}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyTasks(filtersRef.current);
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      setTasks(rows);
      setPagination({
        page: data?.page || 1,
        limit: data?.limit || 20,
        total: data?.total || 0,
        totalPages: data?.totalPages || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return { tasks, loading, error, pagination, refresh };
}

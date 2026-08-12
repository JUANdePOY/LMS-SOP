import { useState, useCallback, useRef } from 'react';
import { getTasks, createTask, updateTask, deleteTask, getTaskStats } from '../services/taskService';
import { useToast } from '@/shared/components/ui/Toast';

export function useTasks(filters = {}) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tasksData = await getTasks(filtersRef.current);
      const data = Array.isArray(tasksData?.rows) ? tasksData.rows : [];
      setTasks(data);
      setPagination({
        page: tasksData?.page || 1,
        limit: tasksData?.limit || 20,
        total: tasksData?.total || 0,
        totalPages: tasksData?.totalPages || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const statsData = await getTaskStats();
      setStats(statsData || null);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([load(), loadStats()]);
  }, [load, loadStats]);

  const refreshTasks = useCallback(async () => {
    await load();
  }, [load]);

  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  const create = async (payload) => {
    await createTask(payload);
    toast.success('Task created successfully');
    await load();
  };

  const update = async (id, payload) => {
    await updateTask(id, payload);
    toast.success('Task updated successfully');
    await load();
  };

  const remove = async (id) => {
    await deleteTask(id);
    toast.success('Task deleted successfully');
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return { tasks, loading, error, pagination, stats, statsLoading, refresh, refreshTasks, refreshStats, create, update, remove };
}

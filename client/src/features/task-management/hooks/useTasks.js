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

  // Optimistically patch a task in local state. Returns a rollback function
  // that restores the previous snapshot if the server call fails.
  const patchTask = useCallback((id, changes) => {
    let snapshot;
    setTasks((prev) => {
      snapshot = prev.find((t) => t.id === id);
      return prev.map((t) => (t.id === id ? { ...t, ...changes } : t));
    });
    return () => {
      if (snapshot) {
        setTasks((prev) => prev.map((t) => (t.id === id ? snapshot : t)));
      }
    };
  }, []);

  const create = async (payload) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      status: payload.status || 'Pending',
      progress_rate: payload.progress_rate ?? 0,
      assignments: payload.assignments || [],
      created_at: new Date().toISOString(),
      ...payload,
    };
    setTasks((prev) => [optimistic, ...prev]);
    setStats((s) => (s ? { ...s, total: s.total + 1 } : s));
    try {
      const data = await createTask(payload);
      const real = data && data.id ? data : null;
      setTasks((prev) => prev.map((t) => (t.id === tempId ? (real || { ...optimistic, id: tempId }) : t)));
      toast.success('Task created successfully');
      await refreshStats();
    } catch (err) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      setStats((s) => (s ? { ...s, total: Math.max(0, s.total - 1) } : s));
      toast.error(err.message || 'Failed to create task');
    }
  };

  const update = async (id, payload) => {
    let snapshot;
    setTasks((prev) => {
      snapshot = prev.find((t) => t.id === id);
      return prev.map((t) => (t.id === id ? { ...t, ...payload } : t));
    });
    try {
      await updateTask(id, payload);
      toast.success('Task updated successfully');
      await refreshStats();
    } catch (err) {
      if (snapshot) setTasks((prev) => prev.map((t) => (t.id === id ? snapshot : t)));
      toast.error(err.message || 'Failed to update task');
    }
  };

  const remove = async (id) => {
    let prevArr;
    setTasks((curr) => {
      prevArr = curr;
      return curr.filter((t) => t.id !== id);
    });
    try {
      await deleteTask(id);
      toast.success('Task deleted successfully');
      await refreshStats();
    } catch (err) {
      if (prevArr) setTasks(prevArr);
      toast.error(err.message || 'Failed to delete task');
    }
  };

  return {
    tasks,
    loading,
    error,
    pagination,
    stats,
    statsLoading,
    refresh,
    refreshTasks,
    refreshStats,
    patchTask,
    create,
    update,
    remove,
  };
}

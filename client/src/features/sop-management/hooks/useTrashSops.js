import { useState, useEffect, useCallback } from 'react';
import { getTrashedSops, restoreSop, permanentDeleteSop, emptyTrash } from '@/features/sop-management/services/sopService';

export function useTrashSops() {
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const fetchTrashed = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const response = await getTrashedSops(params);
      setSops(response.data?.data?.rows || []);
      setTotal(response.data?.data?.total || 0);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrashed();
  }, [fetchTrashed]);

  const restore = async (id) => {
    await restoreSop(id);
    setSops((prev) => prev.filter((s) => s.id !== id));
  };

  const permanentlyDelete = async (id) => {
    await permanentDeleteSop(id);
    setSops((prev) => prev.filter((s) => s.id !== id));
  };

  const emptyAll = async () => {
    await emptyTrash();
    setSops([]);
    setTotal(0);
  };

  return { sops, loading, error, total, refetch: fetchTrashed, restore, permanentlyDelete, emptyAll };
}

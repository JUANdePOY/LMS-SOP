import { useState, useEffect, useCallback } from 'react';
import { getTrashedModules, restoreModule, permanentDeleteModule } from '@/features/sop-management/services/moduleService';

export function useTrashModules(sopId) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrashed = useCallback(async () => {
    if (!sopId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await getTrashedModules(sopId);
      setModules(response.data?.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [sopId]);

  useEffect(() => {
    fetchTrashed();
  }, [fetchTrashed]);

  const restore = async (moduleId) => {
    await restoreModule(moduleId);
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  };

  const permanentlyDelete = async (moduleId) => {
    await permanentDeleteModule(moduleId);
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  };

  return { modules, loading, error, refetch: fetchTrashed, restore, permanentlyDelete };
}

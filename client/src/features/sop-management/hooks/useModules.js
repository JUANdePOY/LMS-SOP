import { useState, useEffect, useCallback } from 'react';
import { getModules, createModule, updateModule, deleteModule, updateSortOrder, submitForReview } from '@/features/sop-management/services/moduleService';

export function useModules(sopId, versionId = null) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchModules = useCallback(async () => {
    if (!sopId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await getModules(sopId, versionId);
      setModules(response.data.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [sopId, versionId]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const addModule = async (data) => {
    const moduleData = { ...data };
    if (versionId !== null && versionId !== undefined) {
      moduleData.sop_version_id = versionId;
    }
    const response = await createModule(sopId, moduleData);
    setModules((prev) => [...prev, response.data.data]);
    return response.data.data;
  };

  const editModule = async (moduleId, data) => {
    const response = await updateModule(moduleId, data);
    setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, ...data } : m)));
    return response.data.data;
  };

  const removeModule = async (moduleId) => {
    await deleteModule(moduleId);
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  };

  const reorderModules = async (moduleOrders) => {
    await updateSortOrder(sopId, moduleOrders);
    setModules((prev) => {
      const orderMap = {};
      moduleOrders.forEach(({ moduleId, sortOrder }) => {
        orderMap[moduleId] = sortOrder;
      });
      return [...prev].sort((a, b) => (orderMap[a.id] ?? 0) - (orderMap[b.id] ?? 0));
    });
  };

  const submitModuleForReview = async (moduleId) => {
    const response = await submitForReview(moduleId);
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, status: 'In Review' } : m))
    );
    return response.data.data;
  };

  return { modules, loading, error, addModule, editModule, removeModule, reorderModules, submitModuleForReview, refetch: fetchModules };
}
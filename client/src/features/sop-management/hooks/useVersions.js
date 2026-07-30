import { useState, useEffect, useCallback } from 'react';
import { getVersions, createVersion, restoreVersion } from '@/features/sop-management/services/versionService';

export function useVersions(sopId) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVersions = useCallback(async () => {
    if (!sopId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await getVersions(sopId);
      setVersions(response.data.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [sopId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const addVersion = async (data) => {
    const response = await createVersion(sopId, data);
    setVersions((prev) => [...prev, response.data.data]);
    return response.data.data;
  };

  const restore = async (versionId) => {
    const response = await restoreVersion(sopId, versionId);
    return response.data.data;
  };

  return { versions, loading, error, addVersion, restore, refetch: fetchVersions };
}
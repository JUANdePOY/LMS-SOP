import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createVersion, getVersions, restoreVersion } from '../api/version.api';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useSOPVersions(sopId) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!sopId || !isAuthenticated) {
      setVersions([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getVersions(sopId);
      const payload = response.data;
      const list = payload?.data || [];
      const normalized = Array.isArray(list) ? list : [];
      setVersions(normalized);
      return normalized;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load versions'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, sopId]);

  const create = useCallback(async (data) => {
    setSaving(true);
    setError(null);
    try {
      const response = await createVersion(sopId, data);
      const created = response.data?.data || response.data;
      setVersions((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create version'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sopId]);

  const restore = useCallback(async (versionId) => {
    setSaving(true);
    setError(null);
    try {
      const response = await restoreVersion(sopId, versionId);
      const result = response.data?.data || response.data;
      await refresh();
      return result;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to restore version'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sopId, refresh]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !sopId) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh, sopId]);

  return { versions, loading, saving, error, refresh, create, restore };
}

export default useSOPVersions;


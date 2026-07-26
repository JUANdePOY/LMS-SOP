import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createStep, deleteStep, getSteps, updateStep } from '../api/step.api';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useSOPSteps(sopId) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!sopId || !isAuthenticated) {
      setSteps([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getSteps(sopId);
      const payload = response.data;
      const list = payload?.data?.rows || payload?.data || [];
      const normalized = Array.isArray(list) ? list : [];
      setSteps(normalized);
      return normalized;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load steps'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, sopId]);

  const create = useCallback(async (data) => {
    setSaving(true);
    setError(null);
    try {
      const response = await createStep(sopId, data);
      const created = response.data?.data || response.data;
      setSteps((prev) => [...prev, created]);
      return created;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create step'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sopId]);

  const update = useCallback(async (stepId, data) => {
    setSaving(true);
    setError(null);
    try {
      await updateStep(stepId, data);
      setSteps((prev) => prev.map((item) => (item.id === stepId ? { ...item, ...data } : item)));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update step'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const remove = useCallback(async (stepId) => {
    setSaving(true);
    setError(null);
    try {
      await deleteStep(stepId);
      setSteps((prev) => prev.filter((item) => item.id !== stepId));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete step'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !sopId) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh, sopId]);

  return { steps, loading, saving, error, refresh, create, update, remove };
}

export default useSOPSteps;


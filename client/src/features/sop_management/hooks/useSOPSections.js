import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createSection, deleteSection, getSections, updateSection } from '../api/section.api';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useSOPSections(sopId) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!sopId || !isAuthenticated) {
      setSections([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getSections(sopId);
      const payload = response.data;
      const list = payload?.data?.rows || payload?.data || [];
      const normalized = Array.isArray(list) ? list : [];
      setSections(normalized);
      return normalized;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load sections'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, sopId]);

  const create = useCallback(async (data) => {
    setSaving(true);
    setError(null);
    try {
      const response = await createSection(sopId, data);
      const created = response.data?.data || response.data;
      setSections((prev) => [...prev, created]);
      return created;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create section'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sopId]);

  const update = useCallback(async (sectionId, data) => {
    setSaving(true);
    setError(null);
    try {
      await updateSection(sectionId, data);
      setSections((prev) => prev.map((item) => (item.id === sectionId ? { ...item, ...data } : item)));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update section'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const remove = useCallback(async (sectionId) => {
    setSaving(true);
    setError(null);
    try {
      await deleteSection(sectionId);
      setSections((prev) => prev.filter((item) => item.id !== sectionId));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete section'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !sopId) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh, sopId]);

  return { sections, loading, saving, error, refresh, create, update, remove };
}

export default useSOPSections;
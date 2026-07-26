import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addAssignment, fetchAssignments, removeAssignment } from '../services/assignment.service';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useAssignments(sopId) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!sopId || !isAuthenticated) {
      setAssignments([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const list = await fetchAssignments(sopId);
      const normalized = Array.isArray(list) ? list : [];
      setAssignments(normalized);
      return normalized;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load assignments'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, sopId]);

  const create = useCallback(async (values) => {
    setSaving(true);
    setError(null);
    try {
      const created = await addAssignment(sopId, values);
      setAssignments((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      const message = err.validationErrors
        ? Object.values(err.validationErrors).join(', ')
        : getErrorMessage(err, 'Unable to create assignment');
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sopId]);

  const remove = useCallback(async (assignmentId) => {
    setSaving(true);
    setError(null);
    try {
      await removeAssignment(assignmentId);
      setAssignments((prev) => prev.filter((item) => item.id !== assignmentId));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete assignment'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !sopId) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh, sopId]);

  return {
    assignments,
    loading,
    saving,
    error,
    refresh,
    create,
    remove,
  };
}

export default useAssignments;

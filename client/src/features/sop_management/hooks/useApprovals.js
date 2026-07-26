import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createApproval, getApprovals, updateApproval } from '../api/approval.api';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useApprovals(sopId) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!sopId || !isAuthenticated) {
      setApprovals([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getApprovals(sopId);
      const payload = response.data;
      const list = payload?.data || [];
      const normalized = Array.isArray(list) ? list : [];
      setApprovals(normalized);
      return normalized;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load approvals'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, sopId]);

  const create = useCallback(async (data) => {
    setSaving(true);
    setError(null);
    try {
      const response = await createApproval(sopId, data);
      const created = response.data?.data || response.data;
      setApprovals((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create approval'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sopId]);

  const update = useCallback(async (approvalId, data) => {
    setSaving(true);
    setError(null);
    try {
      await updateApproval(approvalId, data);
      setApprovals((prev) =>
        prev.map((item) => (item.id === approvalId ? { ...item, ...data } : item))
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update approval'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !sopId) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh, sopId]);

  return { approvals, loading, saving, error, refresh, create, update };
}

export default useApprovals;


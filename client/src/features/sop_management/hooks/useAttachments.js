import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { deleteAttachment, getAttachments, uploadAttachment } from '../api/attachment.api';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useAttachments(sopId) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!sopId || !isAuthenticated) {
      setAttachments([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getAttachments(sopId);
      const payload = response.data;
      const list = payload?.data || [];
      const normalized = Array.isArray(list) ? list : [];
      setAttachments(normalized);
      return normalized;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load attachments'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, sopId]);

  const upload = useCallback(async (file) => {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await uploadAttachment(sopId, formData);
      const created = response.data?.data || response.data;
      setAttachments((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to upload attachment'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sopId]);

  const remove = useCallback(async (attachmentId) => {
    setSaving(true);
    setError(null);
    try {
      await deleteAttachment(attachmentId);
      setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete attachment'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !sopId) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh, sopId]);

  return { attachments, loading, saving, error, refresh, upload, remove };
}

export default useAttachments;


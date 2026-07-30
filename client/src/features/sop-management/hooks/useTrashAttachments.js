import { useState, useEffect, useCallback } from 'react';
import { getTrashedAttachments, restoreAttachment, permanentDeleteAttachment } from '@/features/sop-management/services/attachmentService';

export function useTrashAttachments(moduleId) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrashed = useCallback(async () => {
    if (!moduleId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await getTrashedAttachments(moduleId);
      setAttachments(response.data?.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    fetchTrashed();
  }, [fetchTrashed]);

  const restore = async (attachmentId) => {
    await restoreAttachment(attachmentId);
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  const permanentlyDelete = async (attachmentId) => {
    await permanentDeleteAttachment(attachmentId);
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  return { attachments, loading, error, refetch: fetchTrashed, restore, permanentlyDelete };
}

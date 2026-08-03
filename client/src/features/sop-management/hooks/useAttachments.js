import { useState, useEffect, useCallback } from 'react';
import { getAttachments, uploadAttachment, createLink, deleteAttachment } from '@/features/sop-management/services/attachmentService';

export function useAttachments(moduleId) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAttachments = useCallback(async () => {
    if (!moduleId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await getAttachments(moduleId);
      setAttachments(response.data.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const upload = async (formData) => {
    const response = await uploadAttachment(moduleId, formData);
    setAttachments((prev) => [...prev, response.data.data]);
    return response.data.data;
  };

  const addLink = async (linkData) => {
    const response = await createLink(moduleId, linkData);
    setAttachments((prev) => [...prev, response.data.data]);
    return response.data.data;
  };

  const remove = async (attachmentId) => {
    await deleteAttachment(attachmentId);
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  return { attachments, loading, error, upload, addLink, remove, refetch: fetchAttachments };
}
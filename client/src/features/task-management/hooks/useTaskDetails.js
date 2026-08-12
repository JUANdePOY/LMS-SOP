import { useState, useCallback } from 'react';
import { getTask, updateProgress as apiUpdateProgress, addComment as apiAddComment, uploadAttachment, deleteAttachment } from '../services/taskService';
import { useToast } from '@/shared/components/ui/Toast';

export function useTaskDetails(taskId) {
  const { toast } = useToast();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTask(taskId);
      setTask(data);
    } catch (err) {
      setError(err.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const updateProgress = async (payload) => {
    setSaving(true);
    try {
      await apiUpdateProgress(payload);
      toast.success('Progress updated');
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to update progress');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const addComment = async (taskId, comment, parentId = null) => {
    setSaving(true);
    try {
      await apiAddComment({ task_id: taskId, comment, parent_id: parentId });
      toast.success('Comment added');
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to add comment');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (taskId, formData) => {
    setSaving(true);
    try {
      await uploadAttachment(taskId, formData);
      toast.success('Attachment uploaded');
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to upload attachment');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const removeAttachment = async (taskId, attachmentId) => {
    setSaving(true);
    try {
      await deleteAttachment(taskId, attachmentId);
      toast.success('Attachment deleted');
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete attachment');
      throw err;
    } finally {
      setSaving(false);
    }
  };
  return { task, loading, error, saving, load, updateProgress, addComment, uploadFile, removeAttachment };
}


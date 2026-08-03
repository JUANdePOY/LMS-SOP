import { useState, useCallback } from 'react';
import {
  getSignatures,
  createSignature,
  updateSignature,
  deleteSignature,
} from '@/features/certificate-management/services/certificateService';
import { useToast } from '@/shared/components/ui/Toast';

export function useSignatures() {
  const { toast } = useToast();
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSignatures = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await getSignatures(params);
      setSignatures(data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch signatures');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleCreate = async (formData) => {
    setSaving(true);
    try {
      const { data } = await createSignature(formData);
      toast.success('Signature uploaded successfully');
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to upload signature';
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id, data) => {
    setSaving(true);
    try {
      const { data: res } = await updateSignature(id, data);
      toast.success('Signature updated successfully');
      return res;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update signature';
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSignature(id);
      toast.success('Signature deleted successfully');
      setSignatures(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete signature';
      toast.error(message);
      throw err;
    }
  };

  return {
    signatures,
    loading,
    saving,
    fetchSignatures,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}

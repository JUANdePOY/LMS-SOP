import { useState, useCallback } from 'react';
import { useToast } from '@/shared/components/ui/Toast';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
} from '../api/client.api';

export function useClients() {
  const { toast } = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClients();
      setClients(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, []);

  const create = async (data) => {
    await createClient(data);
    toast.success('Client created successfully');
    await load();
  };

  const update = async (id, data) => {
    await updateClient(id, data);
    toast.success('Client updated successfully');
    await load();
  };

  const remove = async (id) => {
    await deleteClient(id);
    toast.success('Client deleted successfully');
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  return { clients, loading, error, load, create, update, remove };
}

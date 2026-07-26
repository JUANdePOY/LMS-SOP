import { useCallback, useState } from 'react';
import api from '@/lib/api';

export function useArchiveSOP() {
  const [loading, setLoading] = useState(false);

  const archive = useCallback(async (sopId) => {
    setLoading(true);
    try {
      const response = await api.post(`/sops/${sopId}/transition`, { status: 'Archived' });
      return response.data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { archive, loading };
}

export default useArchiveSOP;


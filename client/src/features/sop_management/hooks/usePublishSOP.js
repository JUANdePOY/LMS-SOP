import { useCallback, useState } from 'react';
import api from '@/lib/api';

export function usePublishSOP() {
  const [loading, setLoading] = useState(false);

  const publish = useCallback(async (sopId) => {
    setLoading(true);
    try {
      const response = await api.post(`/sops/${sopId}/transition`, { status: 'Published' });
      return response.data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { publish, loading };
}

export default usePublishSOP;

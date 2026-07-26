import { useCallback, useState } from 'react';
import api from '@/lib/api';

export function useRestoreVersion() {
  const [loading, setLoading] = useState(false);

  const restore = useCallback(async (sopId, versionId) => {
    setLoading(true);
    try {
      const response = await api.post(`/sops/${sopId}/versions/${versionId}/restore`);
      return response.data?.data || response.data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { restore, loading };
}

export default useRestoreVersion;


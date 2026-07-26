import { useCallback, useState } from 'react';
import { createShare } from '../api/share.api';

export function useShareSOP() {
  const [loading, setLoading] = useState(false);

  const share = useCallback(async (sopId, data) => {
    setLoading(true);
    try {
      const response = await createShare(sopId, data);
      return response.data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { share, loading };
}

export default useShareSOP;

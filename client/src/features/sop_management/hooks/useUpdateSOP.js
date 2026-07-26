import { useCallback, useState } from 'react';
import { updateSop } from '../api/sop.api';

export function useUpdateSOP() {
  const [loading, setLoading] = useState(false);

  const update = useCallback(async (id, data) => {
    setLoading(true);
    try {
      const response = await updateSop(id, data);
      return response.data?.data || response.data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading };
}

export default useUpdateSOP;


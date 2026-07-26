import { useCallback, useState } from 'react';
import { createSop } from '../api/sop.api';

export function useCreateSOP() {
  const [loading, setLoading] = useState(false);

  const create = useCallback(async (data) => {
    setLoading(true);
    try {
      const response = await createSop(data);
      return response.data?.data || response.data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading };
}

export default useCreateSOP;

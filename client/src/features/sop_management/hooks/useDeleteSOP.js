import { useCallback, useState } from 'react';
import { deleteSop } from '../api/sop.api';

export function useDeleteSOP() {
  const [loading, setLoading] = useState(false);

  const remove = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await deleteSop(id);
      return response.data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { remove, loading };
}

export default useDeleteSOP;


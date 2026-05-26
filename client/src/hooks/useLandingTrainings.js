import { useState, useEffect } from 'react';
import { getTrainings, getExternalTrainings } from '@/services/trainingsService';

export default function useLandingTrainings() {
  const [internalTrainings, setInternalTrainings] = useState([]);
  const [externalTrainings, setExternalTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');

      const [internalResult, externalResult] = await Promise.all([
        getTrainings({ limit: 100, status: 'published' }),
        getExternalTrainings({ limit: 100, status: 'open' }),
      ]);

      if (internalResult && !internalResult.success) {
        setError(internalResult.message || 'Failed to load internal trainings');
        setLoading(false);
        return;
      }

      if (externalResult && !externalResult.success) {
        setError(externalResult.message || 'Failed to load external trainings');
        setLoading(false);
        return;
      }

      setInternalTrainings(internalResult?.data?.trainings || []);
      setExternalTrainings(externalResult?.data?.trainings || []);
      setLoading(false);
    }

    load();
  }, []);

  return {
    internalTrainings,
    externalTrainings,
    loading,
    error,
  };
}
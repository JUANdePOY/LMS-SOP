import { useState, useEffect } from 'react';
import { fetchActiveAnnouncements } from '@/services/announcementsService';

export default function useLandingAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await fetchActiveAnnouncements({ limit: 50 });
      if (result && !result.success) {
        setError(result.message || 'Failed to load announcements');
      }
      setAnnouncements(result?.data?.announcements || []);
      setLoading(false);
    }
    load();
  }, []);

  return {
    announcements,
    loading,
    error,
  };
}
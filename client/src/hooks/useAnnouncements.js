import { useState, useEffect } from 'react';
import { fetchAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/services/announcementsService';

export default function useAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addAnnouncement = async (announcement) => {
    try {
      const newAnnouncement = await createAnnouncement(announcement);
      setAnnouncements((prev) => [newAnnouncement, ...prev]);
      return newAnnouncement;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const editAnnouncement = async (id, announcement) => {
    try {
      const updated = await updateAnnouncement(id, announcement);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? updated : a))
      );
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const removeAnnouncement = async (id) => {
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  return {
    announcements,
    loading,
    error,
    refetch: loadAnnouncements,
    addAnnouncement,
    editAnnouncement,
    removeAnnouncement,
  };
}
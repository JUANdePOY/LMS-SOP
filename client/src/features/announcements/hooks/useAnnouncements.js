import { useState, useEffect, useCallback, useRef } from "react";
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from "../api/announcement.api";

export function useAnnouncements(filters = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnnouncements(filtersRef.current);
      const payload = res.data;
      const data = Array.isArray(payload?.data) ? payload.data : [];
      const page = payload?.pagination?.page || 1;
      const limit = payload?.pagination?.limit || 20;
      const total = payload?.pagination?.total || data.length;
      const totalPages = payload?.pagination?.totalPages || Math.ceil(total / limit) || 1;
      setItems(data);
      setPagination({ page, limit, total, totalPages });
    } catch (err) {
      setError(err.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (payload) => {
    const res = await createAnnouncement(payload);
    if (res.data?.success) {
      setItems((prev) => [res.data.data, ...prev]);
      return res.data;
    }
    throw new Error(res.data?.message || "Failed to create announcement");
  };

  const update = async (id, payload) => {
    const res = await updateAnnouncement(id, payload);
    if (res.data?.success) {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...res.data.data } : item)));
      return res.data;
    }
    throw new Error(res.data?.message || "Failed to update announcement");
  };

  const remove = async (id) => {
    const res = await deleteAnnouncement(id);
    if (res.data?.success) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      return res.data;
    }
    throw new Error(res.data?.message || "Failed to delete announcement");
  };

  return { items, loading, error, pagination, refresh: load, create, update, remove };
}

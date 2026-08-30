import { useState, useEffect, useCallback, useRef } from "react";
import { getConversations, getMessages, createConversation, sendMessage, markAsRead, deleteConversation } from "../api/message.api";

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const res = await getConversations();
      if (!cancelRef.current) {
        const data = Array.isArray(res.data?.data) ? res.data.data : [];
        setConversations(data);
      }
    } catch (err) {
      if (!cancelRef.current) setError(err.message || "Failed to load conversations");
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => { cancelRef.current = true; };
  }, [load]);

  const create = async (payload) => {
    const res = await createConversation(payload);
    if (res.data?.success) {
      setConversations((prev) => [res.data.data, ...prev]);
      return res.data.data;
    }
    throw new Error(res.data?.message || "Failed to create conversation");
  };

  const markRead = async (conversationId, messageId) => {
    await markAsRead(messageId);
    setConversations((prev) => prev.map((c) => (
      c.id === conversationId
        ? { ...c, unread_count: Math.max((c.unread_count || 0) - 1, 0) }
        : c
    )));
  };

  const remove = async (id) => {
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  return { conversations, loading, error, refresh: load, create, markRead, remove };
}

export function useMessages(conversationId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const cancelRef = useRef(false);
  const isFirstLoad = useRef(true);

  const load = useCallback(async (showSpinner = false) => {
    if (!conversationId) return;
    if (showSpinner) setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const res = await getMessages(conversationId);
      if (!cancelRef.current) {
        const data = Array.isArray(res.data?.data) ? res.data.data : [];
        setMessages(data);
      }
    } catch (err) {
      if (!cancelRef.current && showSpinner) setError(err.message || "Failed to load messages");
    } finally {
      if (!cancelRef.current && showSpinner) setLoading(false);
      isFirstLoad.current = false;
    }
  }, [conversationId]);

  useEffect(() => {
    isFirstLoad.current = true;
    load(true);
    intervalRef.current = setInterval(() => load(false), 8000);
    return () => {
      clearInterval(intervalRef.current);
      cancelRef.current = true;
    };
  }, [load]);

  const send = async ({ text, mentions, files }) => {
    const res = await sendMessage(conversationId, { text, mentions, files });
    if (res.data?.success) {
      setMessages((prev) => [...prev, res.data.data]);
      return res.data;
    }
    throw new Error(res.data?.message || "Failed to send message");
  };

  const read = async (messageId) => {
    const res = await markAsRead(messageId);
    if (res.data?.success) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, read_at: new Date().toISOString() } : m)));
    }
  };

  const markAllAsRead = useCallback(async (currentUserId) => {
    const unread = messages.filter((m) => !m.read_at && m.sender_id !== currentUserId);
    if (unread.length === 0) return;
    await Promise.all(unread.map((m) => markAsRead(m.id).catch(() => {})));
    setMessages((prev) => prev.map((m) => ({ ...m, read_at: m.read_at || new Date().toISOString() })));
  }, [messages]);

  return { messages, loading, error, refresh: load, send, read, markAllAsRead };
}

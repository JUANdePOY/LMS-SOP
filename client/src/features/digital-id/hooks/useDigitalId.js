import { useState, useEffect, useCallback } from 'react';
import { LINK_TYPES, STORAGE_KEY, createEmptyLink } from '../utils/constants';

export default function useDigitalId() {
  const [links, setLinks] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore parse errors
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
    } catch {
      // ignore storage errors
    }
  }, [links]);

  const addLink = useCallback((type = 'website') => {
    setLinks(prev => [...prev, createEmptyLink()]);
  }, []);

  const updateLink = useCallback((id, updates) => {
    setLinks(prev => prev.map(link => link.id === id ? { ...link, ...updates } : link));
  }, []);

  const removeLink = useCallback((id) => {
    setLinks(prev => prev.filter(link => link.id !== id));
  }, []);

  const resetLinks = useCallback(() => {
    setLinks([]);
  }, []);

  return {
    links,
    addLink,
    updateLink,
    removeLink,
    resetLinks,
  };
}

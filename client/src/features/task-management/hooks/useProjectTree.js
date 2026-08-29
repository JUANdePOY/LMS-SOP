import { useState, useEffect, useCallback } from 'react';
import { getProjectTree } from '../services/projectService';

export function useProjectTree() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjectTree();
      setTree(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load project tree');
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { tree, loading, error, refresh: load };
}

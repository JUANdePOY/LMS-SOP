import { useState, useCallback } from 'react';
import { useToast } from '@/shared/components/ui/Toast';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../services/projectService';

export function useProjects() {
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const list = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjects(params);
      setProjects(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to load projects');
      setProjects([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback(async (id) => {
    return await getProject(id);
  }, []);

  const create = useCallback(async (payload) => {
    const project = await createProject(payload);
    toast.success('Project created');
    return project;
  }, [toast]);

  const update = useCallback(async (id, payload) => {
    const project = await updateProject(id, payload);
    toast.success('Project updated');
    return project;
  }, [toast]);

  const remove = useCallback(async (id) => {
    await deleteProject(id);
    toast.success('Project deleted');
  }, [toast]);

  return { projects, loading, error, list, get, create, update, remove };
}

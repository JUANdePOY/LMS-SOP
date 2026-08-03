import { useState, useCallback } from 'react';
import {
  getCertificateTemplates,
  createCertificateTemplate,
  updateCertificateTemplate,
  deleteCertificateTemplate,
  getCertificateTemplateStats,
} from '@/features/certificate-management/services/certificateService';
import { normalizeSections } from '@/features/certificate-management/constants/certificateSections';
import { useToast } from '@/shared/components/ui/Toast';

const DEFAULT_SECTIONS = normalizeSections({});

export function useCertificates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 20 });
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getCertificateTemplates(filters);
      const rows = (data?.data?.rows || []).map((template) => {
        if (template.sections && typeof template.sections === 'string') {
          try {
            return { ...template, sections: JSON.parse(template.sections) };
          } catch {
            return template;
          }
        }
        return template;
      });
      setTemplates(rows);
      setTotal(data?.data?.total || 0);
      setTotalPages(data?.data?.totalPages || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await getCertificateTemplateStats();
      setStats(data?.data || []);
    } catch (err) {
      console.error('Failed to fetch template stats', err);
    }
  }, [toast]);

  const handleCreate = async (formData) => {
    setSaving(true);
    try {
      const { data } = await createCertificateTemplate(formData);
      toast.success('Template created successfully');
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create template';
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id, formData) => {
    setSaving(true);
    try {
      const { data } = await updateCertificateTemplate(id, formData);
      toast.success('Template updated successfully');
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update template';
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCertificateTemplate(id);
      toast.success('Template deleted successfully');
      await fetchTemplates();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete template';
      toast.error(message);
      throw err;
    }
  };

  return {
    templates,
    stats,
    loading,
    saving,
    filters,
    setFilters,
    totalPages,
    total,
    fetchTemplates,
    fetchStats,
    handleCreate,
    handleUpdate,
    handleDelete,
    defaultSections: DEFAULT_SECTIONS,
  };
}

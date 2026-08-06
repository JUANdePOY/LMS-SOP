import { useState, useCallback, useEffect, useMemo } from 'react';
import { getSops, createSop, updateSop, deleteSop, archiveSop, unarchiveSop } from '@/features/sop-management/services/sopService';
import { createAssignment } from '@/features/sop-management/services/assignmentService';
import { createModule } from '@/features/sop-management/services/moduleService';
import { createLink } from '@/features/sop-management/services/attachmentService';
import { useAssignmentCascade } from '@/features/sop-management/hooks/useAssignmentCascade';
import { getCategories } from '@/features/organization-management/api/category.api';
import { SOP_STATUSES } from '@/features/sop-management/constants/sopConstants';
import { useToast } from '@/shared/components/ui/Toast';

export function useSOPList() {
  const { toast } = useToast();
  const cascade = useAssignmentCascade();
  const [sops, setSops] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newRestrictionType, setNewRestrictionType] = useState('department');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [editingSopId, setEditingSopId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [archivedTab, setArchivedTab] = useState(false);

  const filteredCategories = useMemo(() => {
    if (!categories.length) return [];
    if (!cascade.selectedDeptIds.length) return [];
    return categories.filter((cat) => cat.department_id && cascade.selectedDeptIds.includes(cat.department_id));
  }, [categories, cascade.selectedDeptIds]);

  useEffect(() => {
    if (!cascade.selectedDeptIds.length) {
      setNewCategoryId('');
      setEditCategoryId('');
    }
  }, [cascade.selectedDeptIds]);

  useEffect(() => {
    let mounted = true;
    setLoadingCategories(true);
    getCategories({ limit: 100 })
      .then((r) => {
        if (mounted) setCategories(r.data?.data?.rows || []);
      })
      .catch(() => {
        if (mounted) setCategories([]);
      })
      .finally(() => {
        if (mounted) setLoadingCategories(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const fetchSops = useCallback(
    async (searchValue = search, statusValue = status) => {
      setLoading(true);
      try {
        const params = {};
        if (searchValue) params.search = searchValue;
        if (archivedTab) {
          params.status = SOP_STATUSES.ARCHIVED;
        } else {
          params.exclude_status = SOP_STATUSES.ARCHIVED;
          if (statusValue) params.status = statusValue;
        }
        const { data } = await getSops(params);
        setSops(data?.data?.rows || []);
      } catch (err) {
        toast.error('Failed to fetch SOPs');
      } finally {
        setLoading(false);
      }
    },
    [archivedTab, search, status]
  );

  const resetForm = useCallback(() => {
    setNewTitle('');
    setNewDescription('');
    setNewLink('');
    setNewRestrictionType('department');
    setNewCategoryId('');
    cascade.setSelectedBusinessIds([]);
    cascade.setSelectedDeptIds([]);
    cascade.setSelectedPositions([]);
    cascade.setSelectedUserIds([]);
    cascade.setUserSearch('');
  }, [cascade]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      const { data: sopData } = await createSop({
        title: newTitle,
        description: newDescription,
        department_id: cascade.selectedDeptIds.length > 0 ? cascade.selectedDeptIds[0] : (cascade.filteredDepartments[0]?.id || null),
        category_id: newCategoryId || null,
        status: SOP_STATUSES.DRAFT,
        restriction_type: newRestrictionType,
      });
      const sopId = sopData?.data?.id || sopData?.id;
      
      // Create a default module for the SOP
      const moduleResponse = await createModule(sopId, {
        title: 'Main Content',
        content: '',
        sort_order: 1,
      });
      const moduleId = moduleResponse?.data?.id || moduleResponse?.id;
      
      // Handle assignments
      if (sopId && cascade.selectedDeptIds.length > 0) {
        await createAssignment(sopId, {
          department_ids: cascade.selectedDeptIds,
          position_names: cascade.selectedPositions,
          user_ids: cascade.selectedUserIds,
          due_date: null,
          notes: '',
        });
      }
      
      // Handle link if provided
      if (sopId && newLink && newLink.trim() && moduleId) {
        await createLink(moduleId, {
          link_url: newLink,
          link_title: 'Reference Link',
        });
      }
      
      resetForm();
      setShowCreate(false);
      await fetchSops();
      toast.success('SOP created successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create SOP');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (sop) => {
    setEditingSopId(sop.id);
    setEditTitle(sop.title);
    setEditDescription(sop.description || '');
    setEditStatus(sop.status);
    setEditCategoryId(sop.category_id || '');
  };

  const handleEditCancel = () => {
    setEditingSopId(null);
    setEditTitle('');
    setEditDescription('');
    setEditStatus('');
    setEditCategoryId('');
  };

  const handleEditSave = async (sopId) => {
    if (!editTitle.trim()) return;
    try {
      await updateSop(sopId, {
        title: editTitle,
        description: editDescription,
        status: editStatus,
        category_id: editCategoryId || null,
      });
      setEditingSopId(null);
      await fetchSops();
      toast.success('SOP updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update SOP');
    }
  };

  const handleDeleteSop = async (sopId) => {
    try {
      await deleteSop(sopId);
      await fetchSops();
      toast.success('SOP deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete SOP');
    }
  };

  const handleArchiveSop = async (sop) => {
    try {
      if (sop.status === SOP_STATUSES.ARCHIVED) {
        await unarchiveSop(sop.id);
        toast.success('SOP unarchived successfully');
      } else {
        await archiveSop(sop.id);
        toast.success('SOP archived successfully');
      }
      await fetchSops();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update SOP archive status');
    }
  };

  return {
    // SOP list state
    sops,
    loading,
    search,
    setSearch,
    status,
    setStatus,
    archivedTab,
    setArchivedTab,
    showCreate,
    setShowCreate,
    // Create form state
    newTitle,
    setNewTitle,
    newDescription,
    setNewDescription,
    newLink,
    setNewLink,
    newRestrictionType,
    setNewRestrictionType,
    newCategoryId,
    setNewCategoryId,
    categories,
    loadingCategories,
    filteredCategories,
    // Edit form state
    editingSopId,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    editStatus,
    setEditStatus,
    editCategoryId,
    setEditCategoryId,
    // Handlers
    fetchSops,
    resetForm,
    handleCreate,
    handleEditStart,
    handleEditCancel,
    handleEditSave,
    handleDeleteSop,
    handleArchiveSop,
    // Cascade
    cascade,
  };
}

export default useSOPList;

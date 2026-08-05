import { useState, useCallback } from 'react';
import { getSops, createSop, updateSop, deleteSop, archiveSop, unarchiveSop } from '@/features/sop-management/services/sopService';
import { createAssignment } from '@/features/sop-management/services/assignmentService';
import { createModule } from '@/features/sop-management/services/moduleService';
import { createLink } from '@/features/sop-management/services/attachmentService';
import { useAssignmentCascade } from '@/features/sop-management/hooks/useAssignmentCascade';
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
  const [editingSopId, setEditingSopId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [archivedTab, setArchivedTab] = useState(false);

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
  };

  const handleEditCancel = () => {
    setEditingSopId(null);
    setEditTitle('');
    setEditDescription('');
    setEditStatus('');
  };

  const handleEditSave = async (sopId) => {
    if (!editTitle.trim()) return;
    try {
      await updateSop(sopId, {
        title: editTitle,
        description: editDescription,
        status: editStatus,
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
    // Edit form state
    editingSopId,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    editStatus,
    setEditStatus,
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

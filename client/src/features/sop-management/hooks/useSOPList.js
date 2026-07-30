import { useState, useCallback } from 'react';
import { getSops, createSop, updateSop, deleteSop } from '@/features/sop-management/services/sopService';
import { createAssignment } from '@/features/sop-management/services/assignmentService';
import { useAssignmentCascade } from '@/features/sop-management/hooks/useAssignmentCascade';
import { SOP_STATUSES } from '@/features/sop-management/constants/sopConstants';

export function useSOPList() {
  const cascade = useAssignmentCascade();
  const [sops, setSops] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
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
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [archivedTab, search, status]
  );

  const resetForm = useCallback(() => {
    setNewTitle('');
    setNewDescription('');
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
        department_id: null,
        status: SOP_STATUSES.DRAFT,
      });
      const sopId = sopData?.data?.id || sopData?.id;
      if (sopId && cascade.selectedDeptIds.length > 0) {
        await createAssignment(sopId, {
          department_ids: cascade.selectedDeptIds,
          position_names: cascade.selectedPositions,
          user_ids: cascade.selectedUserIds,
          due_date: null,
          notes: '',
        });
      }
      resetForm();
      setShowCreate(false);
      await fetchSops();
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error('Failed to update SOP:', err);
    }
  };

  const handleDeleteSop = async (sopId) => {
    try {
      await deleteSop(sopId);
      await fetchSops();
    } catch (err) {
      console.error('Failed to delete SOP:', err);
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
    // Cascade
    cascade,
  };
}

export default useSOPList;

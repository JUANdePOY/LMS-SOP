import { useState, useCallback, useEffect, useMemo } from 'react';
import { getSops, createSop, updateSop, deleteSop, archiveSop, unarchiveSop } from '@/features/sop-management/services/sopService';
import { createAssignment, fetchAssigned, deleteAssignment } from '@/features/sop-management/services/assignmentService';
import { createModule } from '@/features/sop-management/services/moduleService';
import { createLink } from '@/features/sop-management/services/attachmentService';
import { useAssignmentCascade } from '@/features/sop-management/hooks/useAssignmentCascade';
import { getCategories } from '@/features/organization-management/api/category.api';
import { SOP_STATUSES } from '@/features/sop-management/constants/sopConstants';
import { useToast } from '@/shared/components/ui/Toast';

// A SOP's `restriction_type` gates who can actually see it (sopModel's
// restrictionWhere/canAccessSop): 'department' only ever checks the single
// sops.department_id column, while 'assigned' checks every department,
// position, and user recorded in sop_assignments. Whenever more than the
// SOP's single home department is involved, 'department' silently hides
// the SOP from everyone assigned via the other departments/positions/users
// even though their assignment rows were created correctly — so any real
// assignment (one or many) must use 'assigned' to actually be visible.
function resolveRestrictionType(deptIds = [], positions = [], userIds = []) {
  const hasAnyAssignment = deptIds.length > 0 || positions.length > 0 || userIds.length > 0;
  return hasAnyAssignment ? 'assigned' : 'public';
}

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
  const [newCategoryId, setNewCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [editingSopId, setEditingSopId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  // The assignment row IDs currently persisted for the SOP being edited,
  // and the department IDs they represent — captured in handleEditStart so
  // handleEditSave can tell whether the selection actually changed and,
  // if so, replace the old rows instead of leaving stale ones behind.
  const [editAssignmentIds, setEditAssignmentIds] = useState([]);
  const [editOriginalDeptIds, setEditOriginalDeptIds] = useState([]);
  const [archivedTab, setArchivedTab] = useState(false);
  const [newIsDefaultOnboarding, setNewIsDefaultOnboarding] = useState(false);
  const [editIsDefaultOnboarding, setEditIsDefaultOnboarding] = useState(false);

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
    setNewCategoryId('');
    cascade.setSelectedBusinessIds([]);
    cascade.setSelectedDeptIds([]);
    cascade.setSelectedPositions([]);
    cascade.setSelectedUserIds([]);
    cascade.setUserSearch('');
    setNewIsDefaultOnboarding(false);
  }, [cascade]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      const { data: sopData } = await createSop({
        title: newTitle,
        description: newDescription,
        department_id: cascade.selectedDeptIds.length > 0 ? cascade.selectedDeptIds[0] : null,
        category_id: newCategoryId || null,
        status: SOP_STATUSES.DRAFT,
        restriction_type: resolveRestrictionType(cascade.selectedDeptIds, cascade.selectedPositions, cascade.selectedUserIds),
        is_default_onboarding: newIsDefaultOnboarding ? 1 : 0,
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
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to create SOP');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = async (sop) => {
    setEditingSopId(sop.id);
    setEditTitle(sop.title);
    setEditDescription(sop.description || '');
    setEditStatus(sop.status);
    setEditCategoryId(sop.category_id || '');
    setEditIsDefaultOnboarding(!!sop.is_default_onboarding);
    setEditAssignmentIds([]);
    setEditOriginalDeptIds([]);
    cascade.setSelectedPositions([]);
    cascade.setSelectedUserIds([]);

    // Set business/department selection exactly once, straight to its
    // final value, rather than clearing to [] and then repopulating —
    // an intermediate empty selectedDeptIds would trip the effect above
    // that blanks editCategoryId whenever no department is selected,
    // wiping the category we just set even though departments end up
    // repopulated a moment later.
    try {
      const { data } = await fetchAssigned(sop.id);
      const assignments = data?.data || [];
      const assignmentIds = assignments.map((a) => a.assignment_id);
      const deptIds = [...new Set(assignments.flatMap((a) => (a.departments || []).map((d) => d.id)))];
      const businessIds = [...new Set(
        cascade.departments.filter((d) => deptIds.includes(d.id)).map((d) => d.business_id)
      )];

      setEditAssignmentIds(assignmentIds);
      setEditOriginalDeptIds(deptIds);
      cascade.setSelectedBusinessIds(businessIds);
      cascade.setSelectedDeptIds(deptIds);
    } catch {
      // No saved assignments (or the lookup failed) — leave the cascade
      // empty rather than blocking the edit form from opening.
      cascade.setSelectedBusinessIds([]);
      cascade.setSelectedDeptIds([]);
    }
  };

  const handleEditCancel = () => {
    setEditingSopId(null);
    setEditTitle('');
    setEditDescription('');
    setEditStatus('');
    setEditCategoryId('');
    cascade.setSelectedBusinessIds([]);
    cascade.setSelectedDeptIds([]);
    cascade.setSelectedPositions([]);
    cascade.setSelectedUserIds([]);
    setEditAssignmentIds([]);
    setEditOriginalDeptIds([]);
    setEditIsDefaultOnboarding(false)
  };

  const handleEditSave = async (sopId) => {
    if (!editTitle.trim()) return;
    try {
      const currentDeptIds = cascade.selectedDeptIds;

      await updateSop(sopId, {
        title: editTitle,
        description: editDescription,
        status: editStatus,
        category_id: editCategoryId || null,
        department_id: currentDeptIds.length > 0 ? currentDeptIds[0] : null,
        restriction_type: resolveRestrictionType(currentDeptIds, cascade.selectedPositions, cascade.selectedUserIds),
        is_default_onboarding: editIsDefaultOnboarding ? 1 : 0, 
      });

      // Only touch the assignment records if the department selection
      // actually changed — avoids churning (and re-auditing) assignments
      // on every save, and avoids a false DUPLICATE_ASSIGNMENT rejection
      // from re-creating the same assignment the SOP already has.
      const deptsChanged =
        currentDeptIds.length !== editOriginalDeptIds.length ||
        currentDeptIds.some((id) => !editOriginalDeptIds.includes(id));

      if (deptsChanged) {
        for (const assignmentId of editAssignmentIds) {
          await deleteAssignment(assignmentId);
        }
        if (currentDeptIds.length > 0) {
          await createAssignment(sopId, {
            department_ids: currentDeptIds,
            position_names: cascade.selectedPositions,
            user_ids: cascade.selectedUserIds,
            due_date: null,
            notes: '',
          });
        }
      }

      setEditingSopId(null);
      await fetchSops();
      toast.success('SOP updated successfully');
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to update SOP');
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
    // Onboarding
    newIsDefaultOnboarding,
    setNewIsDefaultOnboarding,
    editIsDefaultOnboarding,
    setEditIsDefaultOnboarding,
  };
}

export default useSOPList;
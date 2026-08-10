import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/shared/components/ui/Toast';
import { createSop } from '@/features/sop-management/services/sopService';
import { createModule } from '@/features/sop-management/services/moduleService';
import { createAssignment } from '@/features/sop-management/services/assignmentService';
import { getCategories } from '@/features/organization-management/api/category.api';
import { useAssignmentCascade } from '@/features/sop-management/hooks/useAssignmentCascade';
import SOPCreateForm from '@/features/sop-management/components/SOPCreateForm';

function BusinessSopCreateForm({ open, onClose, businessId, onCreated }) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDefaultOnboarding, setIsDefaultOnboarding] = useState(false);

  const cascade = useAssignmentCascade();

  useEffect(() => {
    if (businessId && cascade.businesses.length > 0) {
      cascade.setSelectedBusinessIds([businessId]);
    }
  }, [businessId, cascade]);

  useEffect(() => {
    if (!open) return;
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
    return () => { mounted = false; };
  }, [open]);

  const filteredCategories = useMemo(() => {
    if (!categories.length) return [];
    if (!cascade.selectedDeptIds.length) return [];
    return categories.filter((cat) => cat.department_id && cascade.selectedDeptIds.includes(cat.department_id));
  }, [categories, cascade.selectedDeptIds]);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setCategoryId('');
      setIsDefaultOnboarding(false);
      cascade.setSelectedBusinessIds([]);
      cascade.setSelectedDeptIds([]);
      cascade.setSelectedPositions([]);
      cascade.setSelectedUserIds([]);
      cascade.setUserSearch('');
    }
  }, [open, cascade]);

  const handleCreate = async () => {
    if (!title.trim() || loading) return;
    setLoading(true);
    try {
      const { data: sopData } = await createSop({
        title: title.trim(),
        description: description.trim(),
        department_id: cascade.selectedDeptIds.length > 0 ? cascade.selectedDeptIds[0] : null,
        category_id: categoryId || null,
        status: 'Draft',
        restriction_type: cascade.selectedDeptIds.length > 0 ? 'assigned' : 'public',
        is_default_onboarding: isDefaultOnboarding ? 1 : 0,
      });

      const sopId = sopData?.data?.id || sopData?.id;
      if (!sopId) throw new Error('SOP creation failed');

      await createModule(sopId, {
        title: 'Main Content',
        content: '',
        sort_order: 1,
      });

      if (cascade.selectedDeptIds.length > 0) {
        await createAssignment(sopId, {
          department_ids: cascade.selectedDeptIds,
          position_names: cascade.selectedPositions,
          user_ids: cascade.selectedUserIds,
          due_date: null,
          notes: '',
        });
      }

      toast.success('SOP created successfully');
      onCreated?.(sopId);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Failed to create SOP');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!open) return null;

  return (
    <SOPCreateForm
      showCreate={open}
      setShowCreate={onClose}
      newTitle={title}
      setNewTitle={setTitle}
      newDescription={description}
      setNewDescription={setDescription}
      newCategoryId={categoryId}
      setNewCategoryId={setCategoryId}
      filteredCategories={filteredCategories}
      loadingCategories={loadingCategories}
      loading={loading}
      cascade={cascade}
      onCancel={handleCancel}
      onCreate={handleCreate}
      newIsDefaultOnboarding={isDefaultOnboarding}
      setNewIsDefaultOnboarding={setIsDefaultOnboarding}
    />
  );
}

export default BusinessSopCreateForm;

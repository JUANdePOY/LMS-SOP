import { useState } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import { useSOPModal } from '../../context/SOPModalContext';
import { useCreateSOP } from '../../hooks/useCreateSOP';
import { useDepartmentList } from '../../hooks/useDepartmentList';
import SOPBasicInfoForm from '../forms/SOPBasicInfoForm';

const EMPTY_FORM = {
  title: '',
  code: '',
  description: '',
  department_id: '',
  category_id: '',
};

export default function CreateSOPModal({ onCreated }) {
  const { modalState, closeModal } = useSOPModal();
  const { create, loading } = useCreateSOP();
  const { departments } = useDepartmentList();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const open = modalState.create;

  const handleClose = () => {
    if (loading) return;
    setFormData(EMPTY_FORM);
    setErrors({});
    setSubmitError(null);
    closeModal('create');
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.title.trim() || formData.title.trim().length < 2) {
      nextErrors.title = 'Title must be at least 2 characters';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    try {
      const payload = {
        title: formData.title.trim(),
        code: formData.code.trim() || undefined,
        description: formData.description.trim() || undefined,
        department_id: formData.department_id ? parseInt(formData.department_id, 10) : undefined,
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : undefined,
      };

      const created = await create(payload);
      setFormData(EMPTY_FORM);
      closeModal('create');
      onCreated?.(created);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to create SOP');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create SOP"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="create-sop-form" disabled={loading}>
            {loading ? 'Creating…' : 'Create SOP'}
          </Button>
        </>
      }
    >
      <form id="create-sop-form" onSubmit={handleSubmit}>
        {submitError && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError}
          </div>
        )}
        <SOPBasicInfoForm formData={formData} onChange={setFormData} errors={errors} departments={departments} />
      </form>
    </Modal>
  );
}
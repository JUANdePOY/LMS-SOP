import { useState } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { useSOPModal } from '../../context/SOPModalContext';
import { useCreateSOP } from '../../hooks/useCreateSOP';
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
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-sop-form"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create SOP'}
          </button>
        </>
      }
    >
      <form id="create-sop-form" onSubmit={handleSubmit}>
        {submitError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {submitError}
          </div>
        )}
        <SOPBasicInfoForm formData={formData} onChange={setFormData} errors={errors} />
      </form>
    </Modal>
  );
}
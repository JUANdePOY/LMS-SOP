import { Modal } from '@/shared/components/ui/modal';
import SOPAssignmentForm from '../forms/SOPAssignmentForm';

export default function AssignmentModal({ open, onClose, onSubmit, saving, departments = [] }) {
  return (
    <Modal open={open} onClose={onClose} title="Add Assignment">
      <SOPAssignmentForm onSubmit={onSubmit} saving={saving} departments={departments} />
    </Modal>
  );
}
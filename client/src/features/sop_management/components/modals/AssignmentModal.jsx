import { Modal } from '@/shared/components/ui/modal';
import SOPAssignmentForm from '../forms/SOPAssignmentForm';

export default function AssignmentModal({ open, onClose, onSubmit, saving }) {
  return (
    <Modal open={open} onClose={onClose} title="Add Assignment">
      <SOPAssignmentForm onSubmit={onSubmit} saving={saving} />
    </Modal>
  );
}


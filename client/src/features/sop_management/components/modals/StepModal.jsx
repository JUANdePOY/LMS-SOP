import { Modal } from '@/shared/components/ui/modal';
import SOPStepForm from '../forms/SOPStepForm';

export default function StepModal({ open, onClose, steps, onCreate, onUpdate, onRemove, saving }) {
  return (
    <Modal open={open} onClose={onClose} title="Manage Steps">
      <SOPStepForm
        steps={steps}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onRemove={onRemove}
        saving={saving}
      />
    </Modal>
  );
}


import { Modal } from '@/shared/components/ui/modal';
import SOPSectionForm from '../forms/SOPSectionForm';

export default function SectionModal({ open, onClose, sections, onCreate, onUpdate, onRemove, saving }) {
  return (
    <Modal open={open} onClose={onClose} title="Manage Sections">
      <SOPSectionForm
        sections={sections}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onRemove={onRemove}
        saving={saving}
      />
    </Modal>
  );
}


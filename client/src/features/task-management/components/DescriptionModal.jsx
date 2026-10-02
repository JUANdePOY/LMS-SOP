import { useState, useEffect, useRef, memo } from 'react';
import { X, AlignLeft } from 'lucide-react';
import TaskRichTextEditor from './TaskRichTextEditor';

const DescriptionModal = memo(function DescriptionModal({ open, onClose, onSubmit, initialDescription }) {
  const [value, setValue] = useState(initialDescription || '');

  useEffect(() => {
    if (open) {
      setValue(initialDescription || '');
    }
  }, [open, initialDescription]);

  if (!open) return null;

  const handleSubmit = () => {
    onSubmit(value);
    onClose();
  };

  const handleClose = () => {
    setValue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] dark:bg-[var(--color-primary)]/15 dark:text-[var(--color-primary)]">
              <AlignLeft size={15} />
            </div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Edit Description</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 -mr-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4">
          <TaskRichTextEditor
            value={value}
            onChange={setValue}
            placeholder="Add a description..."
            minHeight="180px"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-4 sm:px-6 py-4">
          <button
            onClick={handleClose}
            className="rounded-lg px-3.5 py-2 text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
});

export default DescriptionModal;

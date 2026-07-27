import { X } from 'lucide-react';
import DepartmentForm from './DepartmentForm';

export default function DepartmentModal({
  open,
  onClose,
  onSubmit,
  initialData,
  loading,
  businesses = [],
  departments = [],
  users = [],
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-surface)] z-10">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {initialData ? 'Edit Department' : 'Create Department'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4">
          <DepartmentForm
            initialData={initialData}
            onSubmit={onSubmit}
            onCancel={onClose}
            loading={loading}
            businesses={businesses}
            departments={departments}
            users={users}
          />
        </div>
      </div>
    </div>
  );
}


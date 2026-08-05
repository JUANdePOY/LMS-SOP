import { X } from 'lucide-react';
import CheckboxList from './CheckboxList';
import GroupedCheckboxList from './GroupedCheckboxList';

function SOPCreateForm({
  showCreate,
  setShowCreate,
  newTitle,
  setNewTitle,
  newDescription,
  setNewDescription,
  loading,
  cascade,
  onCancel,
  onCreate,
}) {
  if (!showCreate) return null;

  const handleClose = () => {
    onCancel();
    setShowCreate(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div
        className="relative z-10 flex w-full sm:max-w-lg flex-col rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm max-h-[92vh] sm:max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border)] shrink-0">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">New SOP</h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 -mr-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">SOP Title</label>
            <input
              type="text"
              placeholder="SOP Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description (optional)</label>
            <textarea
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 placeholder:text-[var(--text-muted)]"
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Assignments</h4>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Business</label>
              <CheckboxList
                items={cascade.businesses}
                selectedIds={cascade.selectedBusinessIds}
                onToggle={cascade.toggleBusiness}
                labelKey="business_name"
                valueKey="id"
                placeholder="Select businesses..."
                loading={cascade.loading.businesses}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Departments</label>
              <GroupedCheckboxList
                items={cascade.groupedDepartments}
                selectedIds={cascade.selectedDeptIds}
                onToggle={cascade.toggleDepartment}
                labelKey="name"
                valueKey="id"
                loading={cascade.loading.departments}
                emptyText={cascade.selectedBusinessIds.length ? 'No departments for selected businesses' : 'Select a business first'}
                className="max-h-40 overflow-y-auto"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Users</label>
                {typeof cascade.totalUsers === 'number' && (
                  <span className="text-xs text-[var(--text-muted)]">{cascade.totalUsers} found</span>
                )}
              </div>
              <GroupedCheckboxList
                items={cascade.users}
                selectedIds={cascade.selectedUserIds}
                onToggle={cascade.toggleUser}
                onToggleBulk={cascade.toggleUsers}
                groupKey="business_name"
                subgroupKey="department_name"
                labelKey="full_name"
                subLabelKey="position_title"
                valueKey="id"
                loading={cascade.loading.users}
                emptyText={cascade.selectedDeptIds.length ? 'No users found' : 'Select a department first'}
                className="max-h-48 overflow-y-auto"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 sm:px-6 py-4 border-t border-[var(--border)] shrink-0 bg-[var(--bg-surface)]">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SOPCreateForm;
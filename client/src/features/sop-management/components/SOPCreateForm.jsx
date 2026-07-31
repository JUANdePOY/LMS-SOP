import { X, Plus } from 'lucide-react';
import CheckboxList from './CheckboxList';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { onCancel(); setShowCreate(false); }} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">New SOP</h3>
          <button
            type="button"
            onClick={() => { onCancel(); setShowCreate(false); }}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">SOP Title</label>
            <input
              type="text"
              placeholder="SOP Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description (optional)</label>
            <textarea
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
              rows={3}
            />
          </div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-2 mb-1">Assignments</h4>
          <CheckboxList
            items={cascade.businesses}
            selectedIds={cascade.selectedBusinessIds}
            onToggle={cascade.toggleBusiness}
            labelKey="business_name"
            valueKey="id"
            placeholder="Select businesses..."
          />
          <CheckboxList
            items={cascade.filteredDepartments}
            selectedIds={cascade.selectedDeptIds}
            onToggle={cascade.toggleDepartment}
            labelKey="name"
            valueKey="id"
            placeholder="Select departments..."
          />
          <CheckboxList
            items={cascade.positions}
            selectedIds={cascade.selectedPositions}
            onToggle={cascade.togglePosition}
            labelKey={(p) => p}
            valueKey={(p) => p}
            placeholder="Select positions..."
          />
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Users</span>
              <span className="text-xs text-neutral-400">{cascade.totalUsers} found</span>
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={cascade.userSearch}
              onChange={(e) => cascade.setUserSearch(e.target.value)}
              className="w-full rounded border border-neutral-300 dark:border-neutral-600 px-2 py-1 text-xs bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 mb-2 focus:outline-none focus:border-indigo-500"
            />
            <CheckboxList
              items={cascade.users}
              selectedIds={cascade.selectedUserIds}
              onToggle={cascade.toggleUser}
              labelKey="full_name"
              valueKey="id"
              placeholder="Select users..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => { onCancel(); setShowCreate(false); }}
            className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button onClick={onCreate} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SOPCreateForm;

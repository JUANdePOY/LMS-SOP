import { SOP_STATUSES, SOP_STATUSES_LIST } from '@/features/sop-management/constants/sopConstants';
import CheckboxList from './CheckboxList';

function SOPEditForm({
  sop,
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editStatus,
  setEditStatus,
  cascade,
  onCancel,
  onSave,
  loading,
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">SOP Title</label>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="SOP Title"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description (optional)</label>
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
          rows={2}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Status</label>
        <select
          value={editStatus}
          onChange={(e) => setEditStatus(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500"
        >
          {SOP_STATUSES_LIST.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
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
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm text-neutral-600 dark:text-neutral-400 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(sop.id)}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default SOPEditForm;

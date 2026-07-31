import { SOP_STATUSES_LIST } from '@/features/sop-management/constants/sopConstants';
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
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 placeholder:text-[var(--text-muted)]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description (optional)</label>
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 placeholder:text-[var(--text-muted)]"
          rows={2}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Status</label>
        <select
          value={editStatus}
          onChange={(e) => setEditStatus(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
        >
          {SOP_STATUSES_LIST.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-1">Assignments</h4>
      <div className="space-y-2">
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
          <CheckboxList
            items={cascade.filteredDepartments}
            selectedIds={cascade.selectedDeptIds}
            onToggle={cascade.toggleDepartment}
            labelKey="name"
            valueKey="id"
            placeholder="Select departments..."
            loading={cascade.loading.departments}
            emptyText={cascade.selectedBusinessIds.length ? 'No departments for selected businesses' : 'Select a business first'}
          />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Users</span>
            <span className="text-xs text-[var(--text-muted)]">{cascade.totalUsers} found</span>
          </div>
       
          <CheckboxList
            items={cascade.users}
            selectedIds={cascade.selectedUserIds}
            onToggle={cascade.toggleUser}
            labelKey="full_name"
            valueKey="id"
            placeholder="Select users..."
            loading={cascade.loading.users}
            emptyText={cascade.selectedDeptIds.length ? 'No users found' : 'Select a department first'}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(sop.id)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default SOPEditForm;

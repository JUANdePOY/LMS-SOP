import CheckboxList from './CheckboxList';
import GroupedCheckboxList from './GroupedCheckboxList';

function SOPEditForm({
  sop,
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editCategoryId,
  setEditCategoryId,
  filteredCategories,
  loadingCategories,
  cascade,
  onCancel,
  onSave,
}) {
  return (
    <div className="space-y-4">
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

      <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-1">Assignments</h4>
      <div className="space-y-3">
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
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Category</label>
          <select
            value={editCategoryId}
            onChange={(e) => setEditCategoryId(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
            disabled={loadingCategories || !cascade.selectedDeptIds.length}
          >
            <option value="">{
              cascade.selectedDeptIds.length
                ? 'Select category...'
                : 'Select a department first'
            }</option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(sop.id)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default SOPEditForm;
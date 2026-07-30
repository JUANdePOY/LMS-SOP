import { useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useAssignmentCascade } from '@/features/sop-management/hooks/useAssignmentCascade';
import { createAssignment } from '@/features/sop-management/services/assignmentService';

function CheckboxList({ items, selectedIds, onToggle, labelKey, valueKey, placeholder }) {
  const [open, setOpen] = useState(false);
  const selectedCount = selectedIds.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-200 hover:border-indigo-500 transition-colors flex items-center justify-between"
      >
        <span className={selectedCount > 0 ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'}>
          {selectedCount > 0 ? `${selectedCount} selected` : placeholder}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-lg">
          {items.length === 0 ? (
            <p className="px-3 py-2 text-sm text-neutral-400">No options</p>
          ) : (
            items.map((item) => {
              const id = valueKey ? item[valueKey] : item;
              const label = labelKey ? item[labelKey] : item;
              const checked = selectedIds.includes(id);
              return (
                <label
                  key={id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(id)}
                    className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-neutral-700 dark:text-neutral-300">{label}</span>
                  {checked && <Check size={14} className="ml-auto text-green-600" />}
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function AssignmentForm({ sopId, onCreated }) {
  const cascade = useAssignmentCascade();

  const handleSubmit = async () => {
    if (!cascade.selectedDeptIds.length) return;
    try {
      await createAssignment(sopId, {
        department_ids: cascade.selectedDeptIds,
        position_names: cascade.selectedPositions,
        user_ids: cascade.selectedUserIds,
        due_date: null,
        notes: '',
      });
      cascade.setSelectedDeptIds([]);
      cascade.setSelectedPositions([]);
      cascade.setSelectedUserIds([]);
      onCreated?.();
    } catch (err) {
      console.error('Failed to create assignment', err);
    }
  };

  return (
    <div className="space-y-3">
      <CheckboxList
        items={cascade.departments}
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
      <button
        onClick={handleSubmit}
        disabled={!cascade.selectedDeptIds.length}
        className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Assign Selected
      </button>
    </div>
  );
}

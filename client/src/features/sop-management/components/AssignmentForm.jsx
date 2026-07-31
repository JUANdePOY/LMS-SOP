import { useState } from 'react';
import { useAssignmentCascade } from '@/features/sop-management/hooks/useAssignmentCascade';
import { createAssignment } from '@/features/sop-management/services/assignmentService';
import CheckboxList from './CheckboxList';

export default function AssignmentForm({ sopId, onCreated }) {
  const cascade = useAssignmentCascade();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!cascade.selectedDeptIds.length || submitting) return;
    setSubmitting(true);
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
      cascade.setUserSearch('');
      onCreated?.();
    } catch (err) {
      console.error('Failed to create assignment', err);
    } finally {
      setSubmitting(false);
    }
  };

  const submitDisabled = !cascade.selectedDeptIds.length || submitting;

  return (
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
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Positions</label>
        <CheckboxList
          items={cascade.positions}
          selectedIds={cascade.selectedPositions}
          onToggle={cascade.togglePosition}
          labelKey={(p) => p}
          valueKey={(p) => p}
          placeholder="Select positions..."
          loading={cascade.loading.positions}
          emptyText={cascade.selectedDeptIds.length ? 'No positions found' : 'Select a department first'}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Users</span>
          <span className="text-xs text-[var(--text-muted)]">{cascade.totalUsers} found</span>
        </div>
        <input
          type="search"
          placeholder="Search users..."
          value={cascade.userSearch}
          onChange={(e) => cascade.setUserSearch(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] mb-2 outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
        />
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

      <button
        onClick={handleSubmit}
        disabled={submitDisabled}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
      >
        {submitting ? 'Assigning...' : 'Assign Selected'}
      </button>
    </div>
  );
}

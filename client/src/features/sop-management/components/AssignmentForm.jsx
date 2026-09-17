import { useState, useEffect } from 'react';
import { useAssignmentCascade } from '@/features/sop-management/hooks/useAssignmentCascade';
import { createAssignment } from '@/features/sop-management/services/assignmentService';
import { useToast } from '@/shared/components/ui/Toast';
import CheckboxList from './CheckboxList';
import GroupedCheckboxList from './GroupedCheckboxList';

export default function AssignmentForm({
  sopId,
  onCreated,
  existingAssignments = [],
  lockedDepartmentIds = null,
  allowedBusinessId = null,
  allowedDepartmentIds = null,
  isDepartmentHead = false,
  isAdmin = false,
  isSuperAdmin = false,
}) {
  const { toast } = useToast();
  const cascade = useAssignmentCascade();
  const [submitting, setSubmitting] = useState(false);

  const {
    setSelectedDeptIds,
    setSelectedPositions,
    setSelectedUserIds,
    setSelectedBusinessIds,
    setUserSourceDeptIds,
    departments,
    groupedDepartments,
    businesses,
  } = cascade;

  const isDepartmentLocked = Boolean(lockedDepartmentIds && lockedDepartmentIds.length > 0);
  const businessRestricted = allowedBusinessId != null;
  const departmentsRestricted = allowedDepartmentIds != null;

  const availableBusinesses = businessRestricted
    ? businesses.filter((b) => b.id === allowedBusinessId)
    : businesses;

  const availableGroupedDepartments = departmentsRestricted
    ? groupedDepartments.filter((d) => allowedDepartmentIds.includes(d.id))
    : businessRestricted
      ? groupedDepartments.filter((d) => d.business_id === allowedBusinessId)
      : groupedDepartments;

  const hideBusiness = isDepartmentHead || isAdmin;
  const hideDepartment = isDepartmentHead;

  useEffect(() => {
    if (!isDepartmentLocked) return;
    if (!Array.isArray(existingAssignments) || existingAssignments.length === 0) {
      setSelectedDeptIds(lockedDepartmentIds);
      setUserSourceDeptIds(lockedDepartmentIds);
      return;
    }
    const deptIds = new Set();
    const positions = new Set();
    const userIds = new Set();
    for (const assignment of existingAssignments) {
      for (const dept of assignment.departments || []) {
        if (lockedDepartmentIds.includes(dept.id)) {
          deptIds.add(dept.id);
        }
      }
      for (const pos of assignment.positions || []) positions.add(pos);
      for (const user of assignment.users || []) userIds.add(user.id);
    }
    if (deptIds.size > 0) {
      setSelectedDeptIds(Array.from(deptIds));
    } else {
      setSelectedDeptIds(lockedDepartmentIds);
    }
    setUserSourceDeptIds(Array.from(deptIds).length > 0 ? Array.from(deptIds) : lockedDepartmentIds);
    setSelectedPositions(Array.from(positions));
    setSelectedUserIds(Array.from(userIds));
  }, [existingAssignments, lockedDepartmentIds, isDepartmentLocked, setSelectedDeptIds, setSelectedPositions, setSelectedUserIds, setUserSourceDeptIds]);

  useEffect(() => {
    if (!isDepartmentLocked || !groupedDepartments.length) return;
    const businessIds = new Set();
    for (const dept of groupedDepartments) {
      for (const item of dept.items || []) {
        if (lockedDepartmentIds.includes(item.id)) {
          if (item.business_id != null) businessIds.add(item.business_id);
        }
      }
    }
    if (businessIds.size > 0) {
      setSelectedBusinessIds(Array.from(businessIds));
    }
  }, [isDepartmentLocked, lockedDepartmentIds, groupedDepartments, setSelectedBusinessIds]);

  useEffect(() => {
    if (isDepartmentLocked) return;
    if (existingAssignments && existingAssignments.length > 0) return;
    if (!isDepartmentHead && !isAdmin && !isSuperAdmin) return;
    if (!departments.length) return;
    setUserSourceDeptIds(departments.map((d) => d.id));
  }, [existingAssignments, isDepartmentLocked, isDepartmentHead, isAdmin, isSuperAdmin, departments, setUserSourceDeptIds]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!cascade.selectedDeptIds.length && !cascade.selectedUserIds.length) return;
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
      cascade.setUserSourceDeptIds([]);
      onCreated?.();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const submitDisabled = submitting || (!cascade.selectedDeptIds.length && !cascade.selectedUserIds.length);

  return (
    <div className="space-y-3">
      {!hideBusiness && (
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Business</label>
          <CheckboxList
            items={availableBusinesses}
            selectedIds={cascade.selectedBusinessIds}
            onToggle={cascade.toggleBusiness}
            labelKey="business_name"
            valueKey="id"
            placeholder="Select businesses..."
            loading={cascade.loading.businesses}
            disabled={isDepartmentLocked || businessRestricted}
          />
        </div>
      )}

      {!hideDepartment && (
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Departments</label>
          <GroupedCheckboxList
            items={availableGroupedDepartments}
            selectedIds={cascade.selectedDeptIds}
            onToggle={cascade.toggleDepartment}
            labelKey="name"
            valueKey="id"
            loading={cascade.loading.departments}
            emptyText={cascade.selectedBusinessIds.length ? 'No departments for selected businesses' : 'Select a business first'}
            disabled={isDepartmentLocked}
          />
        </div>
      )}

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
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">{cascade.totalUsers} found</span>
            {cascade.users.length > 0 && (
              <button
                type="button"
                onClick={() => cascade.toggleUsers(cascade.users.map((u) => u.id))}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                disabled={cascade.loading.users}
              >
                {cascade.users.length > 0 && cascade.users.every((u) => cascade.selectedUserIds.includes(u.id))
                  ? 'Clear all'
                  : 'Select all'}
              </button>
            )}
          </div>
        </div>
        <input
          type="search"
          placeholder="Search users..."
          value={cascade.userSearch}
          onChange={(e) => cascade.setUserSearch(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] mb-2 outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
        />
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
          emptyText={(cascade.selectedDeptIds.length || isAdmin || isDepartmentHead) ? 'No users found' : 'Select a department first'}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitDisabled}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
      >
        {submitting ? 'Assigning...' : 'Assign Selected'}
      </button>
    </div>
  );
}

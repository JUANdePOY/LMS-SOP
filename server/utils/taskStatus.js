// Shared task-status derivation logic. Kept in one place so the stats endpoint
// (KPI cards) and the task list/table compute identical statuses and never drift.

function computeAutoStatus(startDatetime, deadlineDatetime, currentStatus) {
  if (currentStatus === 'Completed' || currentStatus === 'Cancelled') {
    return currentStatus;
  }

  // Only auto-compute from dates when status is still the default/unset state.
  // Any explicit status (e.g. a user-set 'Pending' or 'In Progress') is preserved
  // as-is; progress-driven status changes are handled in updateProgress().
  if (currentStatus !== 'Pending') {
    return currentStatus;
  }

  // Without both a start and deadline date we cannot derive a meaningful auto
  // status. Previously missing dates fell through to `new Date(null)` (epoch
  // 1970), which made `now >= deadline` true and incorrectly flagged brand-new
  // tasks (created with no dates) as "Overdue". Keep the stored default instead.
  if (!startDatetime || !deadlineDatetime) {
    return currentStatus;
  }

  const now = new Date();
  const start = new Date(startDatetime);
  const deadline = new Date(deadlineDatetime);

  // Guard against malformed/empty date values so we never derive a bogus status.
  if (Number.isNaN(start.getTime()) || Number.isNaN(deadline.getTime())) {
    return currentStatus;
  }

  if (now < start) {
    return 'Pending';
  }
  if (now >= start && now < deadline) {
    return 'In Progress';
  }
  if (now >= deadline) {
    return 'Overdue';
  }
  return currentStatus;
}

function deriveParentStatus(children) {
  if (!children || children.length === 0) return null;
  const statuses = children.map((c) => c.status);
  if (statuses.every((s) => s === 'Completed')) return 'Completed';
  if (statuses.some((s) => s === 'In Progress')) return 'In Progress';
  if (statuses.some((s) => s === 'Overdue')) return 'Overdue';
  if (statuses.every((s) => s === 'Cancelled')) return 'Cancelled';
  return 'Pending';
}

module.exports = { computeAutoStatus, deriveParentStatus };

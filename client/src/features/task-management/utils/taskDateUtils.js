/**
 * Shared date formatting utilities for the task-management feature.
 */

/**
 * Convert a datetime string to a local `datetime-local` input value (YYYY-MM-DDTHH:MM).
 * @param {string|undefined} dateStr - ISO datetime string
 * @returns {string}
 */
export function toLocalInputValue(dateStr) {
  return dateStr ? dateStr.slice(0, 16) : '';
}

/**
 * Format a datetime string as a human-readable date+time string.
 * @param {string|undefined} dateStr - ISO datetime string
 * @returns {string} formatted string or '—'
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format a datetime string as a short date string.
 * @param {string|undefined} dateStr - ISO datetime string
 * @returns {string} formatted date or '—'
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Determine whether a task should be treated as overdue.
 * A task is overdue when it has a deadline, is not Completed/Cancelled,
 * and the deadline has already passed.
 * @param {object} task
 * @returns {boolean}
 */
export function isOverdue(task) {
  if (!task?.deadline_datetime) return false;
  if (task.status === 'Completed' || task.status === 'Cancelled') return false;
  return new Date(task.deadline_datetime) < new Date();
}

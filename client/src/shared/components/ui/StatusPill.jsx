// Thin shared re-export of the existing task-management StatusBadge so both
// the employee and admin task pages can import a single canonical StatusPill.
// The logic (status normalization + .status-pill/.s-* styling) lives in the
// source component; see client/src/features/task-management/components/StatusBadge.jsx.
export { default as StatusPill } from '@/features/task-management/components/StatusBadge';

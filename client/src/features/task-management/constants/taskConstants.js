export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];
export const ASSIGNMENT_TYPES = ['User', 'Department', 'Position'];

export const PRIORITY_STYLES = {
  Low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100 border-emerald-200 dark:border-emerald-500/30',
  Medium: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-100 border-blue-200 dark:border-blue-500/30',
  High: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100 border-amber-200 dark:border-amber-500/30',
  Critical: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-100 border-red-200 dark:border-red-500/30',
};

export const STATUS_STYLES = {
  Pending: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-100 border-slate-200 dark:border-slate-500/30',
  'In Progress': 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-100 border-blue-200 dark:border-blue-500/30',
  Completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100 border-emerald-200 dark:border-emerald-500/30',
  Overdue: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-100 border-red-200 dark:border-red-500/30',
  Cancelled: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-500/15 dark:text-neutral-100 border-neutral-200 dark:border-neutral-500/30',
};

export const ASSIGNMENT_TYPE_LABELS = {
  User: 'User',
  Department: 'Department',
  Position: 'Position',
};

export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];
export const ASSIGNMENT_TYPES = ['User', 'Department'];

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
};

/** Default deadline offset: 7 days in milliseconds. */
export const DEFAULT_DUE_DATE_OFFSET_MS = 7 * 24 * 60 * 60 * 1000;

/** Maximum comment length allowed by the backend validator. */
export const MAX_COMMENT_LENGTH = 5000;

/** Maximum attachment file size: 10 MB (matches backend getMaxUploadBytes default). */
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types for task attachments (mirrors backend ALLOWED_MIME). */
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/zip',
  'application/x-zip-compressed',
];

/* Table layout & display constants */

/** CSS grid template columns for the task table. */
export const TASK_TABLE_GRID_COLS = '40px minmax(220px,1.5fr) 210px 180px 150px 150px minmax(180px,1fr) 100px';

/** Status display order in the task table. */
export const TASK_STATUS_ORDER = ['Pending', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];

export const UNKNOWN_STATUS_KEY = '__unknown__';

/** Human-readable labels for each status. */
export const TASK_STATUS_LABELS = {
  Pending: 'Not Started',
  'In Progress': 'In Progress',
  Completed: 'Completed',
  Overdue: 'Overdue',
  Cancelled: 'Cancelled',
  [UNKNOWN_STATUS_KEY]: 'Other',
};

/** Dot colors for priority indicators. */
export const TASK_PRIORITY_DOT = {
  Low: 'bg-emerald-500',
  Medium: 'bg-blue-500',
  High: 'bg-amber-500',
  Critical: 'bg-red-500',
};

export { COURSE_STATUS, COURSE_STATUS_LABELS, COURSE_STATUS_COLORS } from './courseStatus';
export { CONTENT_DIFFICULTY, CONTENT_DIFFICULTY_LABELS, CONTENT_DIFFICULTY_COLORS } from './difficultyLevels';
export { ENROLLMENT_STATUS, ENROLLMENT_STATUS_LABELS, ENROLLMENT_STATUS_COLORS } from './enrollmentStatus';
export { COURSE_ROLES, COURSE_ROLE_LABELS } from './roles';
export { CONTENT_TYPES, CONTENT_TYPE_LABELS, CONTENT_TYPE_ICONS } from './contentTypes';
export { MODULE_TYPES, MODULE_TYPE_LABELS } from './moduleTypes';
export { GRADING_SCALES, GRADING_SCALE_LABELS } from './gradingScales';
export { PAGINATION_OPTIONS } from './pagination';
export { COURSE_PERMISSIONS, PERMISSION_LABELS } from './permissions';

import { COURSE_STATUS_LABELS } from './courseStatus';
import { CONTENT_DIFFICULTY_LABELS } from './difficultyLevels';
import { ENROLLMENT_STATUS_LABELS } from './enrollmentStatus';

export const STATUS_META = {
  published: {
    label: COURSE_STATUS_LABELS.published,
    icon: 'Globe',
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100 border-emerald-200 dark:border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  draft: {
    label: COURSE_STATUS_LABELS.draft,
    icon: 'FileText',
    chip: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-500/20 dark:text-neutral-200 border-neutral-200 dark:border-neutral-500/30',
    dot: 'bg-neutral-400',
  },
  archived: {
    label: COURSE_STATUS_LABELS.archived,
    icon: 'Lock',
    chip: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100 border-amber-200 dark:border-amber-500/30',
    dot: 'bg-amber-500',
  },
  under_review: {
    label: COURSE_STATUS_LABELS.under_review,
    icon: 'Star',
    chip: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-100 border-blue-200 dark:border-blue-500/30',
    dot: 'bg-blue-500',
  },
};

export const DIFFICULTY_META = {
  beginner: { label: CONTENT_DIFFICULTY_LABELS.beginner, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100 border-emerald-200 dark:border-emerald-500/30' },
  intermediate: { label: CONTENT_DIFFICULTY_LABELS.intermediate, color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100 border-amber-200 dark:border-amber-500/30' },
  advanced: { label: CONTENT_DIFFICULTY_LABELS.advanced, color: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-100 border-rose-200 dark:border-rose-500/30' },
  all_levels: { label: CONTENT_DIFFICULTY_LABELS.all_levels, color: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-100 border-sky-200 dark:border-sky-500/30' },
};

export const DIFFICULTIES = Object.keys(CONTENT_DIFFICULTY_LABELS);

export const WIZARD_STEPS = [
  { key: 'basics', label: 'Basics', description: 'Title, description, category, difficulty' },
  { key: 'settings', label: 'Settings', description: 'Status, dates, enrollment, grading' },
  { key: 'review', label: 'Review', description: 'Confirm and create' },
];

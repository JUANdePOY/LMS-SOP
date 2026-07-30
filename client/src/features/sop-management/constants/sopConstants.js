export const SOP_STATUSES = {
  DRAFT: 'Draft',
  FOR_REVIEW: 'For Review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export const SOP_STATUSES_LIST = [
  SOP_STATUSES.DRAFT,
  SOP_STATUSES.FOR_REVIEW,
  SOP_STATUSES.APPROVED,
  SOP_STATUSES.PUBLISHED,
  SOP_STATUSES.ARCHIVED,
];

export const TRASH_TABS = {
  SOPS: 'sops',
  MODULES: 'modules',
  ATTACHMENTS: 'attachments',
};

export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
};

export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: SOP_STATUSES.DRAFT, label: 'Draft' },
  { value: SOP_STATUSES.FOR_REVIEW, label: 'For Review' },
  { value: SOP_STATUSES.APPROVED, label: 'Approved' },
  { value: SOP_STATUSES.PUBLISHED, label: 'Published' },
  { value: SOP_STATUSES.ARCHIVED, label: 'Archived' },
];

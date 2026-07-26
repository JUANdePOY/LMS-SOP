export const SOP_STATUS = Object.freeze({
  DRAFT: 'Draft',
  FOR_REVIEW: 'For Review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
});

export const SOP_STATUS_LABELS = Object.freeze({
  [SOP_STATUS.DRAFT]: 'Draft',
  [SOP_STATUS.FOR_REVIEW]: 'For Review',
  [SOP_STATUS.APPROVED]: 'Approved',
  [SOP_STATUS.PUBLISHED]: 'Published',
  [SOP_STATUS.ARCHIVED]: 'Archived',
});

// Legal forward transitions — enforced in utils/sopStatus.js and services/workflow.service.js.
export const SOP_STATUS_TRANSITIONS = Object.freeze({
  [SOP_STATUS.DRAFT]: [SOP_STATUS.FOR_REVIEW],
  [SOP_STATUS.FOR_REVIEW]: [SOP_STATUS.APPROVED, SOP_STATUS.DRAFT], // rejection -> back to draft
  [SOP_STATUS.APPROVED]: [SOP_STATUS.PUBLISHED],
  [SOP_STATUS.PUBLISHED]: [SOP_STATUS.ARCHIVED],
  [SOP_STATUS.ARCHIVED]: [], // terminal — sp_create_new_version starts a NEW draft, never reopens this one
});

export const SOP_STATUS_LIST = Object.values(SOP_STATUS);
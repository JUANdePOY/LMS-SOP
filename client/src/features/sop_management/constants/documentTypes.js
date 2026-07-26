export const DOCUMENT_TYPE = Object.freeze({
  PDF: 'pdf',
  WORD: 'word',
  IMAGE: 'image',
  VIDEO: 'video',
});

export const DOCUMENT_TYPE_LABELS = Object.freeze({
  [DOCUMENT_TYPE.PDF]: 'PDF',
  [DOCUMENT_TYPE.WORD]: 'Word',
  [DOCUMENT_TYPE.IMAGE]: 'Image',
  [DOCUMENT_TYPE.VIDEO]: 'Video',
});

// MIME allowlist — used by services for sop_documents upload validation (Phase 4)
export const DOCUMENT_TYPE_MIME_MAP = Object.freeze({
  [DOCUMENT_TYPE.PDF]: ['application/pdf'],
  [DOCUMENT_TYPE.WORD]: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  [DOCUMENT_TYPE.IMAGE]: ['image/png', 'image/jpeg', 'image/webp'],
  [DOCUMENT_TYPE.VIDEO]: ['video/mp4', 'video/webm'],
});

export const DOCUMENT_TYPE_LIST = Object.values(DOCUMENT_TYPE);
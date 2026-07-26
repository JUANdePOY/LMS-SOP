export const SECTION_TYPE = Object.freeze({
  PURPOSE: 'purpose',
  SCOPE: 'scope',
  REFERENCES: 'references',
  SAFETY_NOTES: 'safety_notes',
  CUSTOM: 'custom',
});

export const SECTION_TYPE_LABELS = Object.freeze({
  [SECTION_TYPE.PURPOSE]: 'Purpose',
  [SECTION_TYPE.SCOPE]: 'Scope',
  [SECTION_TYPE.REFERENCES]: 'References',
  [SECTION_TYPE.SAFETY_NOTES]: 'Safety Notes',
  [SECTION_TYPE.CUSTOM]: 'Custom',
});

// Only CUSTOM sections require a user-supplied title; the rest use the fixed label above.
export const SECTION_TYPES_REQUIRING_TITLE = Object.freeze([SECTION_TYPE.CUSTOM]);

export const SECTION_TYPE_LIST = Object.values(SECTION_TYPE);
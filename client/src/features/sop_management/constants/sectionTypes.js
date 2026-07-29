export const SECTION_TYPE = Object.freeze({
  PURPOSE: 'Purpose',
  SCOPE: 'Scope',
  OBJECTIVES: 'Objectives',
  RESPONSIBILITIES: 'Responsibilities',
  DEFINITIONS: 'Definitions',
  SAFETY_NOTES: 'Safety Notes',
  REFERENCES: 'References',
  APPENDIX: 'Appendix',
  CUSTOM: 'custom',
});

export const SECTION_TYPE_LABELS = Object.freeze({
  [SECTION_TYPE.PURPOSE]: 'Purpose',
  [SECTION_TYPE.SCOPE]: 'Scope',
  [SECTION_TYPE.OBJECTIVES]: 'Objectives',
  [SECTION_TYPE.RESPONSIBILITIES]: 'Responsibilities',
  [SECTION_TYPE.DEFINITIONS]: 'Definitions',
  [SECTION_TYPE.SAFETY_NOTES]: 'Safety Notes',
  [SECTION_TYPE.REFERENCES]: 'References',
  [SECTION_TYPE.APPENDIX]: 'Appendix',
  [SECTION_TYPE.CUSTOM]: 'Custom',
});

export const SECTION_TYPES_REQUIRING_TITLE = Object.freeze([SECTION_TYPE.CUSTOM]);

export const SECTION_TYPE_LIST = Object.values(SECTION_TYPE);
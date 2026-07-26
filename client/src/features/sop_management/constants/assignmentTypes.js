export const ASSIGNMENT_TYPE = Object.freeze({
  DEPARTMENT: 'Department',
  POSITION: 'Position',
  USER: 'User',
});

export const ASSIGNMENT_TYPE_LABELS = Object.freeze({
  [ASSIGNMENT_TYPE.DEPARTMENT]: 'Department',
  [ASSIGNMENT_TYPE.POSITION]: 'Position',
  [ASSIGNMENT_TYPE.USER]: 'User',
});

export const ASSIGNMENT_TYPE_LIST = Object.values(ASSIGNMENT_TYPE);

export const ACKNOWLEDGEMENT_STATUS = Object.freeze({
  PENDING: 'Pending',
  ACKNOWLEDGED: 'Acknowledged',
});

export const ACKNOWLEDGEMENT_STATUS_LIST = Object.values(ACKNOWLEDGEMENT_STATUS);

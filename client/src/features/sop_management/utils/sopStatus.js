export const buildSopStatusTransition = (currentStatus, nextStatus) => ({
  from: currentStatus,
  to: nextStatus,
  allowed: currentStatus === 'Draft' && nextStatus === 'For Review'
    || currentStatus === 'For Review' && nextStatus === 'Draft'
    || currentStatus === 'For Review' && nextStatus === 'Approved'
    || currentStatus === 'Approved' && nextStatus === 'Published'
    || currentStatus === 'Published' && nextStatus === 'Archived',
});

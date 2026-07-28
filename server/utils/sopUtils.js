const crypto = require('crypto');

function generateSopCode(title, prefix = 'SOP') {
  const cleanPrefix = String(prefix || 'SOP').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'SOP';
  const cleanTitle = String(title || 'SOP').toUpperCase().replace(/[^A-Z]/g, '');
  const suffix = cleanTitle.slice(0, 3).padEnd(3, 'X');
  const stamp = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${cleanPrefix}-${stamp}-${suffix}`;
}

function getNextStatus(currentStatus) {
  const flow = {
    Draft: 'For Review',
    'For Review': 'Approved',
    Approved: 'Published',
    Published: 'Archived',
    Archived: 'Archived',
  };
  return flow[currentStatus] || 'Draft';
}

function canTransitionTo(currentStatus, nextStatus) {
  const transitions = {
    Draft: ['For Review'],
    'For Review': ['Draft', 'Approved'],
    Approved: ['Published'],
    Published: ['Archived'],
    Archived: [],
  };
  return (transitions[currentStatus] || []).includes(nextStatus);
}

module.exports = {
  generateSopCode,
  getNextStatus,
  canTransitionTo,
};

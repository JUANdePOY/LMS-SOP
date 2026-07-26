const { generateSopCode, getNextStatus, canTransitionTo } = require('../utils/sopUtils');

describe('SOP phase 1 helpers', () => {
  test('generates a human-friendly SOP code', () => {
    expect(generateSopCode('Safety Procedure', 'OPS')).toMatch(/^OPS-\d{4}-[A-Z]{3}$/);
  });

  test('allows only valid forward transitions', () => {
    expect(canTransitionTo('Draft', 'For Review')).toBe(true);
    expect(canTransitionTo('Draft', 'Approved')).toBe(false);
    expect(canTransitionTo('For Review', 'Draft')).toBe(true);
    expect(canTransitionTo('Published', 'Archived')).toBe(true);
  });

  test('returns the next logical default status', () => {
    expect(getNextStatus('Draft')).toBe('For Review');
    expect(getNextStatus('Published')).toBe('Archived');
  });
});

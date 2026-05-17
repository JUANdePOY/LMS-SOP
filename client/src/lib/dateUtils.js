// Date utility functions

/**
 * Format date to YYYY-MM-DD for input fields
 * @param {Date} date - Date object
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const formatDateForInput = (date) => {
  if (!(date instanceof Date) || isNaN(date)) return '';
  return date.toISOString().split('T')[0];
};

/**
 * Format date to MM/DD/YYYY for display
 * @param {Date|string} date - Date object or date string
 * @returns {string} Date string in MM/DD/YYYY format
 */
export const formatDateDisplay = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d)) return '';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};

/**
 * Calculate duration between two dates in days
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Duration in days
 */
export const calculateDurationDays = (startDate, endDate) => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  if (!(start instanceof Date) || isNaN(start) || !(end instanceof Date) || isNaN(end)) {
    return 0;
  }
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

/**
 * Check if a date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export const isPastDate = (date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d)) return false;
  return d.setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
};

/**
 * Check if a date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the future
 */
export const isFutureDate = (date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d)) return false;
  return d.setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0);
};

/**
 * Check if a date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export const isToday = (date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d)) return false;
  return d.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);
};

export default {
  formatDateForInput,
  formatDateDisplay,
  calculateDurationDays,
  isPastDate,
  isFutureDate,
  isToday
};
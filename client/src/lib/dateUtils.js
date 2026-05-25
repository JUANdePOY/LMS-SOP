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

/**
 * Format date to locale string, or return TBD if invalid
 * @param {Date|string} value - Date to format
 * @returns {string} Formatted date or 'TBD'
 */
export const shortDate = (value) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString();
};

export const formatFileSize = (bytes) => {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '';
  const num = Number(bytes);
  if (num === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return `${parseFloat((num / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const formatDateShort = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
};

/**
 * Format time to locale string (h:mm AM/PM)
 * @param {Date|string} value - Date/time to format
 * @returns {string} Formatted time or empty string
 */
export const formatTime = (value) => {
  if (!value) return '';
  
  console.log('formatTime input:', value, typeof value);
  
  // Handle time-only strings (HH:MM or HH:MM:SS)
  if (typeof value === 'string') {
    const timeOnlyMatch = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (timeOnlyMatch) {
      const hours = parseInt(timeOnlyMatch[1], 10);
      const minutes = parseInt(timeOnlyMatch[2], 10);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
    }
  }
  
  // Handle Date objects
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export default {
  formatDateForInput,
  formatDateDisplay,
  calculateDurationDays,
  isPastDate,
  isFutureDate,
  isToday,
  shortDate,
  formatTime,
  formatFileSize,
  formatDateShort,
};
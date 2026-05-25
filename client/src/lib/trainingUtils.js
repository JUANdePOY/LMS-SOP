// Training utility functions

/**
 * Format training date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatTrainingDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

/**
 * Format training date and time for display
 * @param {string} dateTimeString - ISO date-time string
 * @returns {string} Formatted date-time
 */
export const formatTrainingDateTime = (dateTimeString) => {
  if (!dateTimeString) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateTimeString).toLocaleDateString(undefined, options);
};

/**
 * Get status badge class based on training status
 * @param {string} status - Training status
 * @returns {string} CSS class for status badge
 */
export const getStatusBadgeClass = (status) => {
  switch (status.toLowerCase()) {
    case 'planned': return 'status-planned';
    case 'active': return 'status-active';
    case 'completed': return 'status-completed';
    case 'cancelled': return 'status-cancelled';
    default: return 'status-unknown';
  }
};

/**
 * Get type badge class based on training type
 * @param {string} type - Training type
 * @returns {string} CSS class for type badge
 */
export const getTypeBadgeClass = (type) => {
  switch (type.toLowerCase()) {
    case 'internal': return 'type-internal';
    case 'external': return 'type-external';
    default: return 'type-unknown';
  }
};

/**
 * Calculate participation percentage
 * @param {number} current - Current number of participants
 * @param {number} max - Maximum allowed participants
 * @returns {number} Participation percentage (0-100)
 */
export const calculateParticipationPercentage = (current, max) => {
  if (!max || max === 0) return 0;
  return Math.min(100, Math.round((current / max) * 100));
};

/**
 * Filter trainings by search term
 * @param {Array} trainings - Array of training objects
 * @param {string} searchTerm - Search term to filter by
 * @returns {Array} Filtered trainings
 */
export const filterTrainingsBySearch = (trainings, searchTerm) => {
  if (!searchTerm) return trainings;
  
  const lowerSearchTerm = searchTerm.toLowerCase();
  return trainings.filter(training => 
    training.title.toLowerCase().includes(lowerSearchTerm) ||
    (training.description && training.description.toLowerCase().includes(lowerSearchTerm))
  );
};

/**
 * Filter trainings by status
 * @param {Array} trainings - Array of training objects
 * @param {string} status - Status to filter by
 * @returns {Array} Filtered trainings
 */
export const filterTrainingsByStatus = (trainings, status) => {
  if (!status || status === 'all') return trainings;
  return trainings.filter(training => training.status === status);
};

/**
 * Filter trainings by type
 * @param {Array} trainings - Array of training objects
 * @param {string} type - Type to filter by
 * @returns {Array} Filtered trainings
 */
export const filterTrainingsByType = (trainings, type) => {
  if (!type || type === 'all') return trainings;
  return trainings.filter(training => training.type === type);
};

/**
 * Get file type category from extension or mime type
 * @param {string} fileType - File extension (e.g., 'pdf', 'docx') or mime type
 * @returns {string} Category: 'image', 'pdf', 'docx', 'xlsx', or 'unknown'
 */
export const getFileTypeCategory = (fileType) => {
  if (!fileType) return 'unknown';
  const normalized = fileType.toLowerCase();
  const images = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  if (images.includes(normalized) || normalized.startsWith('image/')) return 'image';
  if (normalized === 'pdf' || normalized === 'application/pdf') return 'pdf';
  if (normalized === 'docx' || normalized.includes('wordprocessingml')) return 'docx';
  if (normalized === 'xlsx' || normalized === 'xls' || normalized.includes('spreadsheetml')) return 'xlsx';
  return 'unknown';
};

export default {
  formatTrainingDate,
  formatTrainingDateTime,
  getStatusBadgeClass,
  getTypeBadgeClass,
  calculateParticipationPercentage,
  filterTrainingsBySearch,
  filterTrainingsByStatus,
  filterTrainingsByType,
  getFileTypeCategory
};
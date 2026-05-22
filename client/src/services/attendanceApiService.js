import api from './api';

// ── Scan endpoints ───────────────────────────────────────────────────────────

export const scanInternalTraining = (trainingId, barcode, scanMethod = 'barcode_scanner', deviceInfo = null) =>
  api.post(`/attendance/scan/internal/${trainingId}`, { barcode, scan_method: scanMethod, device_info: deviceInfo });

export const scanExternalTraining = (externalTrainingId, barcode, scanMethod = 'barcode_scanner', deviceInfo = null) =>
  api.post(`/attendance/scan/external/${externalTrainingId}`, { barcode, scan_method: scanMethod, device_info: deviceInfo });

// ── Manual check-in ──────────────────────────────────────────────────────────

export const manualCheckInInternal = (trainingId, reservistId, status) =>
  api.post(`/attendance/manual/internal/${trainingId}`, { reservist_id: reservistId, status });

export const manualCheckInExternal = (externalTrainingId, reservistId, status) =>
  api.post(`/attendance/manual/external/${externalTrainingId}`, { reservist_id: reservistId, status });

// ── Attendance lists ─────────────────────────────────────────────────────────

export const getInternalAttendance = (trainingId) =>
  api.get(`/attendance/internal/${trainingId}`);

export const getExternalAttendance = (externalTrainingId) =>
  api.get(`/attendance/external/${externalTrainingId}`);

// ── Update status ────────────────────────────────────────────────────────────

export const updateAttendanceStatus = (id, eventType, status) =>
  api.patch(`/attendance/${eventType}/${id}`, { status });

// ── Scan history ─────────────────────────────────────────────────────────────

export const getScanHistory = (params = {}) =>
  api.get('/attendance/scan-history', { params });

// ── Facilitator management ───────────────────────────────────────────────────

export const assignFacilitator = (data) =>
  api.post('/attendance/facilitators', data);

export const getFacilitators = (params = {}) =>
  api.get('/attendance/facilitators', { params });

// ── My events ─────────────────────────────────────────────────────────────────

export const getMyEvents = () =>
  api.get('/attendance/my-events');

// ── Event status ──────────────────────────────────────────────────────────────

export const getEventStatus = (eventType, id) =>
  api.get(`/attendance/event-status/${eventType}/${id}`);

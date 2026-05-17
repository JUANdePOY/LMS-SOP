import { useState, useEffect } from 'react';

// Mock attendance data
const mockAttendanceRecords = [
  { id: 1, trainingId: 1, participantId: 1, status: 'present', date: '2026-05-01' },
  { id: 2, trainingId: 1, participantId: 2, status: 'absent', date: '2026-05-01' },
  { id: 3, trainingId: 1, participantId: 1, status: 'present', date: '2026-05-02' },
  { id: 4, trainingId: 1, participantId: 2, status: 'present', date: '2026-05-02' }
];

const useAttendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState(mockAttendanceRecords);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Simulate API call to fetch attendance for a training
  const fetchAttendanceByTraining = async (trainingId) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const filtered = mockAttendanceRecords.filter(record => record.trainingId === trainingId);
      setAttendanceRecords(filtered);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Simulate marking attendance
  const markAttendance = async (trainingId, participantId, status, date) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newRecord = {
        id: Date.now(),
        trainingId,
        participantId,
        status,
        date
      };
      setAttendanceRecords(prev => [...prev, newRecord]);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Simulate updating attendance
  const updateAttendance = async (id, updates) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setAttendanceRecords(prev =>
        prev.map(record =>
          record.id === id ? { ...record, ...updates } : record
        )
      );
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    attendanceRecords,
    loading,
    error,
    fetchAttendanceByTraining,
    markAttendance,
    updateAttendance
  };
};

export default useAttendance;
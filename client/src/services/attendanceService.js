// Mock attendance service
// In a real application, this would make actual API calls

const attendanceService = {
  // Get attendance records for a training
  getAttendanceByTrainingId: async (trainingId) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock data
    const mockRecords = [
      { id: 1, trainingId: 1, participantId: 1, status: 'present', date: '2026-05-01' },
      { id: 2, trainingId: 1, participantId: 2, status: 'absent', date: '2026-05-01' },
      { id: 3, trainingId: 1, participantId: 1, status: 'present', date: '2026-05-02' },
      { id: 4, trainingId: 1, participantId: 2, status: 'present', date: '2026-05-02' }
    ];
    
    return mockRecords.filter(record => record.trainingId === trainingId);
  },

  // Mark attendance for a participant
  markAttendance: async (trainingId, participantId, status, date) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In a real app, this would POST to an API endpoint
    return {
      id: Date.now(), // Temporary ID
      trainingId,
      participantId,
      status,
      date
    };
  },

  // Update attendance record
  updateAttendance: async (id, updates) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In a real app, this would PUT/PATCH to an API endpoint
    return {
      id,
      ...updates
    };
  },

  // Get attendance summary for a training
  getAttendanceSummary: async (trainingId) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock summary data
    return {
      totalParticipants: 2,
      presentCount: 1,
      absentCount: 1,
      pendingCount: 0,
      attendanceRate: 50
    };
  }
};

export default attendanceService;
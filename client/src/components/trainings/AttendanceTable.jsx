import React from 'react';

const AttendanceTable = ({ trainingId, participants }) => {
  if (!participants || participants.length === 0) {
    return (
      <div className="attendance-table-empty">
        <p>No participants registered for this training.</p>
      </div>
    );
  }

  return (
    <div className="attendance-table-container">
      <h3>Attendance Records</h3>
      <table className="attendance-table">
        <thead>
          <tr>
            <th>Participant</th>
            <th>Rank</th>
            <th>Unit</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {participants.map(participant => (
            <tr key={participant.id}>
              <td>{participant.name}</td>
              <td>{participant.rank || 'N/A'}</td>
              <td>{participant.unit || 'N/A'}</td>
              <td>
                <span className={`status-badge status-${participant.attendanceStatus || 'pending'}`}>
                  {(participant.attendanceStatus || 'pending').charAt(0).toUpperCase() + (participant.attendanceStatus || 'pending').slice(1)}
                </span>
              </td>
              <td className="actions-cell">
                <div className="actions-dropdown">
                  <button className="btn-icon" title="Mark Present">
                    <i className="fas fa-check-circle"></i>
                  </button>
                  <button className="btn-icon" title="Mark Absent">
                    <i className="fas fa-times-circle"></i>
                  </button>
                  <button className="btn-icon" title="View Details">
                    <i className="fas fa-info-circle"></i>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;
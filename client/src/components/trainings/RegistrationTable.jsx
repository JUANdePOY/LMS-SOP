import React from 'react';

const RegistrationTable = ({ registrations = [], onApprove, onReject, onViewDetails }) => {
  if (!registrations || registrations.length === 0) {
    return (
      <div className="registration-table-empty">
        <p>No registrations found.</p>
      </div>
    );
  }

  return (
    <div className="registration-table-container">
      <h3>External Registrations</h3>
      <table className="registrations-table">
        <thead>
          <tr>
            <th>Participant</th>
            <th>Training</th>
            <th>Registration Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map(reg => (
            <tr key={reg.id}>
              <td>{reg.participantName}</td>
              <td>{reg.trainingTitle}</td>
              <td>{new Date(reg.registrationDate).toLocaleDateString()}</td>
              <td>
                <span className={`status-badge status-${reg.status.toLowerCase()}`}>
                  {reg.status.charAt(0).toUpperCase() + reg.status.slice(1).toLowerCase()}
                </span>
              </td>
              <td className="actions-cell">
                <div className="actions-dropdown">
                  {reg.status === 'pending' && (
                    <>
                      <button 
                        className="btn-icon btn-approve" 
                        title="Approve"
                        onClick={() => onApprove(reg.id)}
                      >
                        <i className="fas fa-check"></i>
                      </button>
                      <button 
                        className="btn-icon btn-reject" 
                        title="Reject"
                        onClick={() => onReject(reg.id)}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </>
                  )}
                  <button 
                    className="btn-icon" 
                    title="View Details"
                    onClick={() => onViewDetails(reg)}
                  >
                    <i className="fas fa-eye"></i>
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

export default RegistrationTable;
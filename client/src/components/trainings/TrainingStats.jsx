import React from 'react';
import { computeTotalSlots } from '@/lib/slotUtils';

const TrainingStats = ({ trainings = [] }) => {
  // Calculate statistics
  const totalTrainings = trainings.length;
  const inProgressStatuses = new Set(['published', 'ongoing', 'open']);
  const inProgressTrainings = trainings.filter((t) => inProgressStatuses.has(t.status)).length;
  const completedTrainings = trainings.filter((t) => t.status === 'completed').length;
  const draftTrainings = trainings.filter((t) => t.status === 'draft').length;
  const cancelledTrainings = trainings.filter((t) => t.status === 'cancelled').length;
  
  // Calculate total participants across all trainings
  const totalParticipants = trainings.reduce((sum, training) => {
    return sum + (training.participants?.length || 0);
  }, 0);
  
  // Calculate average participation rate
  const totalMaxCapacity = trainings.reduce((sum, training) => {
    const slots = computeTotalSlots(training);
    return sum + (slots || 0);
  }, 0);
  
  const avgParticipationRate = totalMaxCapacity > 0 
    ? Math.round((totalParticipants / totalMaxCapacity) * 100) 
    : 0;

  return (
    <div className="training-stats-container">
      <div className="stats-grid">
        {/* Total Trainings */}
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-clipboard-list"></i>
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Trainings</p>
            <p className="stat-value">{totalTrainings}</p>
          </div>
        </div>
        
        {/* Active Trainings */}
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-play-circle"></i>
          </div>
          <div className="stat-content">
            <p className="stat-label">In Progress</p>
            <p className="stat-value">{inProgressTrainings}</p>
          </div>
        </div>
        
        {/* Completed Trainings */}
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="stat-content">
            <p className="stat-label">Completed Trainings</p>
            <p className="stat-value">{completedTrainings}</p>
          </div>
        </div>
        
        {/* Planned Trainings */}
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-calendar-alt"></i>
          </div>
          <div className="stat-content">
            <p className="stat-label">Draft</p>
            <p className="stat-value">{draftTrainings}</p>
          </div>
        </div>
        
        {/* Total Participants */}
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Participants</p>
            <p className="stat-value">{totalParticipants}</p>
          </div>
        </div>
        
        {/* Participation Rate */}
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-percentage"></i>
          </div>
          <div className="stat-content">
            <p className="stat-label">Participation Rate</p>
            <p className="stat-value">{avgParticipationRate}%</p>
          </div>
        </div>
        
        {/* Cancelled Trainings */}
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-times-circle"></i>
          </div>
          <div className="stat-content">
            <p className="stat-label">Cancelled Trainings</p>
            <p className="stat-value">{cancelledTrainings}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingStats;
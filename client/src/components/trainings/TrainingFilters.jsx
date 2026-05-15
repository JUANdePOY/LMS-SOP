import React from 'react';

const TrainingFilters = ({ filters, onChange, onReset }) => {
  return (
    <div className="training-filters">
      <form onChange={e => onChange({ ...filters, [e.target.name]: e.target.value })} className="filters-form">
        <div className="filters-row">
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              name="search"
              value={filters.search || ''}
              placeholder="Search trainings..."
            />
          </div>
          
          <div className="filter-group">
            <label>Status</label>
            <select name="status" value={filters.status || 'all'}>
              <option value="all">All Status</option>
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Type</label>
            <select name="type" value={filters.type || 'all'}>
              <option value="all">All Types</option>
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>
          </div>
        </div>
        
        <div className="filters-row">
          <div className="filter-group">
            <label>Date Range</label>
            <input type="date" name="dateRange" />
          </div>
        </div>
        
        <div className="filters-actions">
          <button type="button" onClick={onReset} className="btn-reset">
            Reset
          </button>
          <button type="submit" className="btn-primary">
            Apply Filters
          </button>
        </div>
      </form>
    </div>
  );
};

export default TrainingFilters;
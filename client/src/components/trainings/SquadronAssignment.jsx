import React from 'react';

const SquadronAssignment = ({ availableSquadrons = [], selectedSquadrons = [], onChange }) => {
  const handleChange = (e) => {
    const squadronId = e.target.value;
    const isSelected = selectedSquadrons.includes(squadronId);
    
    let newSelection;
    if (isSelected) {
      newSelection = selectedSquadrons.filter(id => id !== squadronId);
    } else {
      newSelection = [...selectedSquadrons, squadronId];
    }
    
    onChange(newSelection);
  };

  return (
    <div className="squadron-assignment">
      <h3>Assign Participating Squadrons</h3>
      {availableSquadrons.length === 0 ? (
        <p>No squadrons available.</p>
      ) : (
        <div className="squadron-list">
          {availableSquadrons.map(squadron => (
            <div key={squadron.id} className="squadron-item">
              <label>
                <input
                  type="checkbox"
                  value={squadron.id}
                  checked={selectedSquadrons.includes(squadron.id)}
                  onChange={handleChange}
                />
                {squadron.name}
                {squadron.code && ` (${squadron.code})`}
              </label>
            </div>
          ))}
        </div>
      )}
      
      <div className="selection-summary">
        <strong>Selected:</strong> {selectedSquadrons.length} squadrons
      </div>
    </div>
  );
};

export default SquadronAssignment;
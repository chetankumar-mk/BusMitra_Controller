import React from 'react';
import './Emergency.css';

const Emergency = () => {
  return (
    <div className="emergency-page">
      <div className="page-header">
        <h2>Emergency</h2>
        <p className="page-subtitle">Emergency alerts and SOS signals</p>
      </div>
      <div className="empty-state">
        <p>No active emergency alerts</p>
        <p className="empty-hint">Emergency alerts will appear here when drivers send SOS signals or when critical incidents are reported.</p>
      </div>
    </div>
  );
};

export default Emergency;

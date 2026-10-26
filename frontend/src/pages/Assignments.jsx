import React, { useState, useEffect } from 'react';
import { assignmentService } from '../services/assignmentService';
import { apiClient } from '../api/apiClient';
import './Assignments.css';

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [integrationStatuses, setIntegrationStatuses] = useState({});
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (assignments.length > 0) {
      fetchIntegrationStatuses();
    }
  }, [assignments]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await assignmentService.getAssignments();
      setAssignments(response.assignments || []);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      setError('Failed to load assignments. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchIntegrationStatuses = async () => {
    const statuses = {};
    const uniqueDriverIds = [...new Set(assignments.map(a => a.driverId).filter(Boolean))];
    
    for (const driverId of uniqueDriverIds) {
      try {
        const response = await apiClient.get(`/api/controller/drivers/${driverId}/integration-status`);
        statuses[driverId] = response;
      } catch (error) {
        console.error(`Failed to fetch integration status for driver ${driverId}:`, error);
        statuses[driverId] = { linked: false };
      }
    }
    setIntegrationStatuses(statuses);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'SCHEDULED': { bg: '#dbeafe', color: '#1e40af' },
      'ASSIGNED': { bg: '#e0e7ff', color: '#4338ca' },
      'ACTIVE': { bg: '#dcfce7', color: '#166534' },
      'CANCELLED': { bg: '#fee2e2', color: '#991b1b' },
      'COMPLETED': { bg: '#f1f5f9', color: '#64748b' },
    };
    const style = statusMap[status] || { bg: '#f1f5f9', color: '#64748b' };
    return (
      <span style={{ 
        backgroundColor: style.bg, 
        color: style.color, 
        padding: '4px 12px', 
        borderRadius: '12px', 
        fontSize: '12px', 
        fontWeight: '500',
        textTransform: 'uppercase'
      }}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="assignments-page">
        <div className="page-header">
          <h2>Assignments</h2>
          <p className="page-subtitle">View and manage trip assignments</p>
        </div>
        <div className="loading-state">Loading assignments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assignments-page">
        <div className="page-header">
          <h2>Assignments</h2>
          <p className="page-subtitle">View and manage trip assignments</p>
        </div>
        <div className="error-state">{error}</div>
      </div>
    );
  }

  return (
    <div className="assignments-page">
      <div className="page-header">
        <h2>Assignments</h2>
        <p className="page-subtitle">View and manage trip assignments</p>
      </div>

      {assignments.length === 0 ? (
        <div className="empty-state">
          <p>No assignments found</p>
          <p className="empty-hint">Create assignments in the Assign Bus page</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Assignment ID</th>
                <th>Driver</th>
                <th>Bus</th>
                <th>Route</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Integration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.assignmentId}>
                  <td className="cell-assignment-id">{assignment.assignmentId || 'N/A'}</td>
                  <td>{assignment.driverName} ({assignment.driverId})</td>
                  <td>{assignment.busNumber}</td>
                  <td>{assignment.from} {assignment.via ? `→ ${assignment.via} →` : '→'} {assignment.to}</td>
                  <td>
                    <div>{assignment.scheduledDate}</div>
                    <div className="cell-time">{assignment.scheduledDepartureTime}</div>
                  </td>
                  <td>{getStatusBadge(assignment.status)}</td>
                  <td>
                    {integrationStatuses[assignment.driverId]?.linked ? (
                      <span style={{ color: '#16A34A', fontSize: '12px' }}>Linked</span>
                    ) : (
                      <span style={{ color: '#64748B', fontSize: '12px' }}>Not Linked</span>
                    )}
                  </td>
                  <td className="cell-actions">
                    <button 
                      className="btn-action"
                      onClick={() => setSelectedAssignment(assignment)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedAssignment && (
        <div className="detail-panel">
          <div className="detail-header">
            <h3>Assignment Details</h3>
            <button 
              className="btn-close" 
              onClick={() => setSelectedAssignment(null)}
            >
              Close
            </button>
          </div>
          <div className="detail-content">
            <div className="detail-section">
              <h4>Assignment Information</h4>
              <div className="detail-row">
                <span className="detail-label">Assignment ID:</span>
                <span className="detail-value">{selectedAssignment.assignmentId || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Driver:</span>
                <span className="detail-value">{selectedAssignment.driverName} ({selectedAssignment.driverId})</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Bus Number:</span>
                <span className="detail-value">{selectedAssignment.busNumber}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Route:</span>
                <span className="detail-value">{selectedAssignment.from} {selectedAssignment.via ? `→ ${selectedAssignment.via} →` : '→'} {selectedAssignment.to}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{selectedAssignment.scheduledDate}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Departure:</span>
                <span className="detail-value">{selectedAssignment.scheduledDepartureTime}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className="detail-value">{getStatusBadge(selectedAssignment.status)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;

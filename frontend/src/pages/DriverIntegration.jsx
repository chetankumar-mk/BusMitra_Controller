import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';
import './DriverIntegration.css';

const DriverIntegration = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchIntegrationStatus();
  }, []);

  const fetchIntegrationStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/api/integration/status');
      setStatus(response);
    } catch (error) {
      console.error('Failed to fetch integration status:', error);
      setError('Failed to load integration status. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'CONNECTED': { bg: '#dcfce7', color: '#166534' },
      'DISCONNECTED': { bg: '#fef2f2', color: '#dc2626' },
      'AVAILABLE': { bg: '#dcfce7', color: '#166534' },
      'UNAVAILABLE': { bg: '#f1f5f9', color: '#64748b' },
    };
    const normalizedStatus = status?.toUpperCase() || 'UNKNOWN';
    const style = statusMap[normalizedStatus] || { bg: '#f1f5f9', color: '#64748b' };
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
        {status || 'Unknown'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="driver-integration-page">
        <div className="page-header">
          <h2>Driver Integration</h2>
          <p className="page-subtitle">Backend and driver integration status</p>
        </div>
        <div className="loading-state">Loading integration status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="driver-integration-page">
        <div className="page-header">
          <h2>Driver Integration</h2>
          <p className="page-subtitle">Backend and driver integration status</p>
        </div>
        <div className="error-state">{error}</div>
      </div>
    );
  }

  const stats = status.statistics || {};

  return (
    <div className="driver-integration-page">
      <div className="page-header">
        <h2>Driver Integration</h2>
        <p className="page-subtitle">Backend and driver integration status</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Drivers</div>
          <div className="kpi-value">{stats.totalDrivers || 0}</div>
          <div className="kpi-supporting">Registered controllers</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Firebase Linked</div>
          <div className="kpi-value">{stats.linkedDrivers || 0}</div>
          <div className="kpi-supporting">Drivers with Firebase UID</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Not Linked</div>
          <div className="kpi-value">{stats.totalDrivers - stats.linkedDrivers || 0}</div>
          <div className="kpi-supporting">Missing Firebase UID</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Assignments</div>
          <div className="kpi-value">{stats.totalAssignments || 0}</div>
          <div className="kpi-supporting">Driver-bus assignments</div>
        </div>
      </div>

      {/* Integration Status */}
      <div className="integration-section">
        <div className="section-header">
          <h2>Integration Overview</h2>
        </div>
        <div className="status-grid">
          <div className="status-card">
            <div className="status-card-header">
              <h3>Backend Status</h3>
            </div>
            <div className="status-card-body">
              <div className="status-row">
                <span className="status-label">Service:</span>
                <span className="status-value">{status.service || 'N/A'}</span>
              </div>
              <div className="status-row">
                <span className="status-label">Firebase:</span>
                {getStatusBadge(status.firebase === 'connected' ? 'CONNECTED' : 'DISCONNECTED')}
              </div>
              <div className="status-row">
                <span className="status-label">Assignment API:</span>
                {getStatusBadge(status.assignmentApi ? 'AVAILABLE' : 'UNAVAILABLE')}
              </div>
            </div>
          </div>

          <div className="status-card">
            <div className="status-card-header">
              <h3>Driver Statistics</h3>
            </div>
            <div className="status-card-body">
              <div className="status-row">
                <span className="status-label">Total Registered:</span>
                <span className="status-value">{stats.totalDrivers || 0}</span>
              </div>
              <div className="status-row">
                <span className="status-label">Linked to Firebase:</span>
                <span className="status-value">{stats.linkedDrivers || 0}</span>
              </div>
              <div className="status-row">
                <span className="status-label">Not Linked:</span>
                <span className="status-value">{stats.totalDrivers - stats.linkedDrivers || 0}</span>
              </div>
            </div>
          </div>

          <div className="status-card">
            <div className="status-card-header">
              <h3>Assignment Statistics</h3>
            </div>
            <div className="status-card-body">
              <div className="status-row">
                <span className="status-label">Total Assignments:</span>
                <span className="status-value">{stats.totalAssignments || 0}</span>
              </div>
              <div className="status-row">
                <span className="status-label">Drivers with Assignment:</span>
                <span className="status-value">{stats.assignedDrivers || 0}</span>
              </div>
              <div className="status-row">
                <span className="status-label">Drivers without Assignment:</span>
                <span className="status-value">{stats.unassignedDrivers || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Documentation */}
      <div className="info-section">
        <div className="section-header">
          <h2>Integration Endpoints</h2>
        </div>
        <div className="info-card">
          <p className="info-description">
            These endpoints are read-only and designed for future Driver App integration. No Firebase data is modified.
          </p>
          <ul className="api-endpoints">
            <li>
              <code>GET /api/integration/driver/:driverId/assignment</code>
              <span>Get driver assignment by Controller driver ID</span>
            </li>
            <li>
              <code>GET /api/integration/firebase-driver/:firebaseUid/assignment</code>
              <span>Get driver assignment by Firebase UID</span>
            </li>
            <li>
              <code>GET /api/integration/status</code>
              <span>Get integration service status</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DriverIntegration;

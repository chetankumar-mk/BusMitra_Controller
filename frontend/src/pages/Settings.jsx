import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../api/auth';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState('10');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [systemStatus, setSystemStatus] = useState({
    backend: 'checking',
    firebase: 'checking',
    mongodb: 'checking',
    auth: 'checking'
  });

  useEffect(() => {
    fetchUserData();
    checkSystemStatus();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await getCurrentUser();
      if (response.success) {
        setUser(response.user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSystemStatus = async () => {
    // Check backend health
    try {
      const healthResponse = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/health`);
      if (healthResponse.ok) {
        setSystemStatus(prev => ({ ...prev, backend: 'connected' }));
      } else {
        setSystemStatus(prev => ({ ...prev, backend: 'unavailable' }));
      }
    } catch (error) {
      setSystemStatus(prev => ({ ...prev, backend: 'unavailable' }));
    }

    try {
      const authResponse = await getCurrentUser();
      if (authResponse.success) {
        setSystemStatus(prev => ({ ...prev, auth: 'active' }));
      } else {
        setSystemStatus(prev => ({ ...prev, auth: 'inactive' }));
        navigate('/login');
      }
    } catch (error) {
      setSystemStatus(prev => ({ ...prev, auth: 'inactive' }));
      navigate('/login');
    }

    setSystemStatus(prev => ({
      ...prev,
      mongodb: 'unavailable',
      firebase: 'unavailable'
    }));
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'CONNECTED': { bg: '#dcfce7', color: '#166534' },
      'UNAVAILABLE': { bg: '#f1f5f9', color: '#64748b' },
      'ACTIVE': { bg: '#dcfce7', color: '#166534' },
      'INACTIVE': { bg: '#fef2f2', color: '#dc2626' },
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
      <div className="settings">
        <div className="page-header">
          <h2>Settings</h2>
          <p className="page-subtitle">Manage Controller account and system configuration.</p>
        </div>
        <div className="loading-state">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings">
      <div className="page-header">
        <h2>Settings</h2>
        <p className="page-subtitle">Manage controller account and application preferences</p>
      </div>

      <div className="settings-layout">
        {/* Left Column */}
        <div className="settings-left">
          {/* Controller Profile */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h3>Controller Profile</h3>
            </div>
            <div className="settings-card-body">
              <div className="profile-item">
                <span className="profile-label">Username</span>
                <span className="profile-value">{user?.username || 'N/A'}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Role</span>
                <span className="profile-value">Controller</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Depot</span>
                <span className="profile-value">{user?.depotName || 'N/A'}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Account Status</span>
                {getStatusBadge('ACTIVE')}
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h3>Security</h3>
            </div>
            <div className="settings-card-body">
              <div className="security-item">
                <div className="security-info">
                  <span className="security-label">Change Password</span>
                  <span className="security-note">Password change will be available in future update</span>
                </div>
                <button className="btn-secondary" disabled>
                  Change Password
                </button>
              </div>
              <div className="security-item">
                <div className="security-info">
                  <span className="security-label">Logout</span>
                  <span className="security-note">Sign out of your account</span>
                </div>
                <button className="btn-danger" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="settings-right">
          {/* System Status */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h3>System Status</h3>
            </div>
            <div className="settings-card-body">
              <div className="status-item">
                <span className="status-label">Backend API</span>
                {getStatusBadge(systemStatus.backend === 'connected' ? 'CONNECTED' : 'UNAVAILABLE')}
              </div>
              <div className="status-item">
                <span className="status-label">Firebase</span>
                {getStatusBadge(systemStatus.firebase === 'connected' ? 'CONNECTED' : 'UNAVAILABLE')}
              </div>
              <div className="status-item">
                <span className="status-label">MongoDB</span>
                {getStatusBadge(systemStatus.mongodb === 'connected' ? 'CONNECTED' : 'UNAVAILABLE')}
              </div>
              <div className="status-item">
                <span className="status-label">Authentication</span>
                {getStatusBadge(systemStatus.auth === 'active' ? 'ACTIVE' : 'INACTIVE')}
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h3>Preferences</h3>
            </div>
            <div className="settings-card-body">
              <div className="preference-item">
                <span className="preference-label">Auto Refresh</span>
                <select 
                  className="preference-select"
                  value={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.value)}
                >
                  <option value="10">10 seconds</option>
                  <option value="30">30 seconds</option>
                  <option value="60">60 seconds</option>
                </select>
              </div>
              <div className="preference-item">
                <span className="preference-label">Notifications</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  />
                  <span className="toggle-label"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Application Information */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h3>Application Information</h3>
            </div>
            <div className="settings-card-body">
              <div className="info-item">
                <span className="info-label">Application</span>
                <span className="info-value">BusMitra Controller</span>
              </div>
              <div className="info-item">
                <span className="info-label">Version</span>
                <span className="info-value">1.0.0</span>
              </div>
              <div className="info-item">
                <span className="info-label">Environment</span>
                <span className="info-value">Development</span>
              </div>
              <div className="info-item">
                <span className="info-label">Backend URL</span>
                <span className="info-value">{import.meta.env.VITE_API_BASE || 'http://localhost:3001'}</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="settings-card settings-card--danger">
            <div className="settings-card-header">
              <h3>Danger Zone</h3>
            </div>
            <div className="settings-card-body">
              <div className="danger-item">
                <div className="danger-info">
                  <span className="danger-label">Logout</span>
                  <span className="danger-note">Sign out of your account immediately</span>
                </div>
                <button className="btn-danger" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

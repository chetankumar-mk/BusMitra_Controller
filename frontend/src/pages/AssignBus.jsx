import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';
import { assignmentService } from '../services/assignmentService';
import './AssignBus.css';

const AssignBus = () => {
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [createdAssignment, setCreatedAssignment] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    driverId: '',
    busNumber: '',
    routeId: '',
    from: '',
    via: '',
    to: '',
    scheduledDate: '',
    scheduledDepartureTime: '',
  });

  useEffect(() => {
    fetchDrivers();
    fetchRoutes();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError(null);
      const driversResponse = await apiClient.get('/api/controller/drivers');
      setDrivers(driversResponse.drivers || []);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
      setError('Failed to load drivers. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const routesResponse = await apiClient.get('/api/controller/routes');
      setRoutes(routesResponse.routes || []);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRouteChange = (e) => {
    const routeId = e.target.value;
    setFormData(prev => ({ ...prev, routeId }));
    
    if (routeId) {
      const selectedRoute = routes.find(r => r.routeId === routeId);
      if (selectedRoute) {
        setFormData(prev => ({
          ...prev,
          from: selectedRoute.from || '',
          via: selectedRoute.via || '',
          to: selectedRoute.to || ''
        }));
      }
    }
  };

  const handlePreview = (e) => {
    e.preventDefault();
    if (formData.driverId && formData.busNumber && formData.from && formData.to && formData.scheduledDate && formData.scheduledDepartureTime) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmAssignment = async () => {
    setSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await assignmentService.createAssignment(formData);
      setCreatedAssignment(response.assignment);
      setSuccess(true);
      setShowConfirmation(false);
      setFormData({
        driverId: '',
        busNumber: '',
        from: '',
        via: '',
        to: '',
        scheduledDate: '',
        scheduledDepartureTime: '',
      });
    } catch (error) {
      console.error('Failed to create assignment:', error);
      setSubmitError(error.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  const getSelectedDriver = () => drivers.find(d => d.driverId === formData.driverId);

  const getStatusBadge = (status) => {
    const statusMap = {
      'CREATED': { bg: '#dbeafe', color: '#1e40af' },
      'SCHEDULED': { bg: '#dbeafe', color: '#1e40af' },
      'ASSIGNED': { bg: '#dcfce7', color: '#166534' },
      'ACTIVE': { bg: '#dcfce7', color: '#166534' },
      'COMPLETED': { bg: '#f1f5f9', color: '#64748b' },
      'CANCELLED': { bg: '#fee2e2', color: '#991b1b' },
    };
    const style = statusMap[status] || statusMap['CREATED'];
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
      <div className="assign-bus-page">
        <div className="page-header">
          <h2>Assign Bus</h2>
          <p className="page-subtitle">Assign drivers to buses for trips</p>
        </div>
        <div className="loading-state">Loading assignment data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assign-bus-page">
        <div className="page-header">
          <h2>Assign Bus</h2>
          <p className="page-subtitle">Assign drivers to buses for trips</p>
        </div>
        <div className="error-state">{error}</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="assign-bus-page">
        <div className="page-header">
          <h2>Assign Bus</h2>
          <p className="page-subtitle">Assign drivers to buses for trips</p>
        </div>
        <div className="success-state">
          <h2>Assignment Successful!</h2>
          <div className="assignment-details">
            <div className="detail-row">
              <span className="detail-label">Driver:</span>
              <span className="detail-value">{createdAssignment?.driverName} ({createdAssignment?.driverId})</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Bus Number:</span>
              <span className="detail-value">{createdAssignment?.busNumber}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Route:</span>
              <span className="detail-value">{createdAssignment?.from} {createdAssignment?.via ? `→ ${createdAssignment?.via} →` : '→'} {createdAssignment?.to}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date:</span>
              <span className="detail-value">{createdAssignment?.scheduledDate}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Departure:</span>
              <span className="detail-value">{createdAssignment?.scheduledDepartureTime}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value">{getStatusBadge(createdAssignment?.status?.toUpperCase() || 'CREATED')}</span>
            </div>
          </div>
          <button className="btn-primary" onClick={() => setSuccess(false)}>
            Create Another Assignment
          </button>
        </div>
      </div>
    );
  }

  const selectedDriver = getSelectedDriver();

  return (
    <div className="assign-bus-page">
      <div className="page-header">
        <h2>Assign Bus</h2>
        <p className="page-subtitle">Assign drivers to buses for trips</p>
      </div>

      {showConfirmation && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>Confirm Assignment</h3>
            <div className="confirmation-details">
              <div className="detail-row">
                <span className="detail-label">Driver:</span>
                <span className="detail-value">{selectedDriver?.driverName} ({selectedDriver?.driverId})</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Bus Number:</span>
                <span className="detail-value">{formData.busNumber}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Route:</span>
                <span className="detail-value">{formData.from} {formData.via ? `→ ${formData.via} →` : '→'} {formData.to}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{formData.scheduledDate}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Departure:</span>
                <span className="detail-value">{formData.scheduledDepartureTime}</span>
              </div>
            </div>
            <div className="confirmation-actions">
              <button 
                className="btn-secondary"
                onClick={handleCancelConfirmation}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleConfirmAssignment}
                disabled={submitting}
              >
                {submitting ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
            {submitError && (
              <div className="error-message">{submitError}</div>
            )}
          </div>
        </div>
      )}

      <div className="assignment-form-container">
        <form className="assignment-form" onSubmit={handlePreview}>
          <div className="form-group">
            <label htmlFor="driverId">Driver</label>
            <select
              id="driverId"
              name="driverId"
              value={formData.driverId}
              onChange={handleInputChange}
              disabled={drivers.length === 0}
            >
              <option value="">Select a driver</option>
              {drivers.map((driver) => (
                <option key={driver.driverId} value={driver.driverId}>
                  {driver.driverName} ({driver.driverId})
                  {driver.firebaseUid ? '' : ' - NOT LINKED'}
                </option>
              ))}
            </select>
            {drivers.length === 0 && (
              <p className="form-hint">No drivers available. Register drivers in the Drivers page first.</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="busNumber">Bus Number</label>
            <input
              type="text"
              id="busNumber"
              name="busNumber"
              value={formData.busNumber}
              onChange={handleInputChange}
              placeholder="e.g., 101"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="routeId">Route (Optional)</label>
            <select
              id="routeId"
              name="routeId"
              value={formData.routeId}
              onChange={handleRouteChange}
            >
              <option value="">Select a route (optional)</option>
              {routes.filter(r => r.status === 'active').map((route) => (
                <option key={route.routeId} value={route.routeId}>
                  {route.routeName}
                </option>
              ))}
            </select>
            {routes.length === 0 && (
              <p className="form-hint">No routes available. Create routes in the Routes page first.</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="from">From</label>
            <input
              type="text"
              id="from"
              name="from"
              value={formData.from}
              onChange={handleInputChange}
              placeholder="e.g., Lakshmeshwar"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="via">Via (Optional)</label>
            <input
              type="text"
              id="via"
              name="via"
              value={formData.via}
              onChange={handleInputChange}
              placeholder="e.g., Gadag"
            />
          </div>

          <div className="form-group">
            <label htmlFor="to">To</label>
            <input
              type="text"
              id="to"
              name="to"
              value={formData.to}
              onChange={handleInputChange}
              placeholder="e.g., Haveri"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="scheduledDate">Date</label>
              <input
                type="date"
                id="scheduledDate"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="scheduledDepartureTime">Departure Time</label>
              <input
                type="time"
                id="scheduledDepartureTime"
                name="scheduledDepartureTime"
                value={formData.scheduledDepartureTime}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-actions">
            <button 
              className="btn-primary"
              type="submit"
              disabled={!formData.driverId || !formData.busNumber || !formData.from || !formData.to || !formData.scheduledDate || !formData.scheduledDepartureTime}
            >
              Preview Assignment
            </button>
          </div>
        </form>
      </div>

      <div className="info-banner">
        <strong>Note:</strong> This creates a Controller-owned assignment. Firebase custom claims will be updated only if the driver is linked to Firebase.
      </div>
    </div>
  );
};

export default AssignBus;

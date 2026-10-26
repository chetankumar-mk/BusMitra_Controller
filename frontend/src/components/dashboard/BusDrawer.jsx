import React, { useState } from 'react';
import { Drawer } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { Bus, User, ClipboardList, MapPin, Activity, Clock, Copy, Map } from 'lucide-react';
import { renderIcon } from '../ui/renderIcon';
import './BusDrawer.css';

const BusDrawer = ({ bus, open, onClose, onViewOnMap }) => {
  const { success, error } = useToast();
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      success('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      // Fail silently if clipboard unavailable
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleString();
  };

  const getBadgeVariant = (status) => {
    const variantMap = {
      'ONLINE': 'success',
      'OFFLINE': 'neutral',
      'ACTIVE': 'success',
      'INACTIVE': 'neutral',
      'ASSIGNED': 'info',
      'UNASSIGNED': 'neutral',
      'UNKNOWN': 'neutral',
      'STALE': 'warning',
    };
    return variantMap[status] || 'neutral';
  };

  if (!bus) return null;

  return (
    <Drawer open={open} onClose={onClose} position="right" size="md">
      <div className="bus-drawer">
        <div className="drawer-header">
          <div className="drawer-title">
            <h3>Bus Details</h3>
            <Badge variant="info">{bus.busNumber || bus.busId}</Badge>
          </div>
          {onViewOnMap && (
            <Button
              icon={Map}
              size="sm"
              onClick={() => {
                onViewOnMap(bus);
                onClose();
              }}
            >
              View on map
            </Button>
          )}
        </div>

        <div className="drawer-content">
          <section className="drawer-section">
            <h4 className="section-title">
              {renderIcon(Bus, { size: 16 })}
              Bus Information
            </h4>
            <div className="detail-row">
              <span className="detail-label">Bus Number</span>
              <span className="detail-value">{bus.busNumber || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Bus ID</span>
              <span className="detail-value detail-value-copy">
                {bus.busId || '—'}
                {bus.busId && (
                  <button
                    className="copy-button"
                    onClick={() => handleCopy(bus.busId, 'busId')}
                    aria-label="Copy bus ID"
                  >
                    {copiedId === 'busId' ? '✓' : renderIcon(Copy, { size: 14 })}
                  </button>
                )}
              </span>
            </div>
          </section>

          {bus.driver && (
            <section className="drawer-section">
              <h4 className="section-title">
                {renderIcon(User, { size: 16 })}
                Driver Information
              </h4>
              <div className="detail-row">
                <span className="detail-label">Driver ID</span>
                <span className="detail-value detail-value-copy">
                  {bus.driver.driverId || '—'}
                  {bus.driver.driverId && (
                    <button
                      className="copy-button"
                      onClick={() => handleCopy(bus.driver.driverId, 'driverId')}
                      aria-label="Copy driver ID"
                    >
                      {copiedId === 'driverId' ? '✓' : renderIcon(Copy, { size: 14 })}
                    </button>
                  )}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Driver Name</span>
                <span className="detail-value">{bus.driver.driverName || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Registered Device ID</span>
                <span className="detail-value detail-value-copy">
                  {bus.driver.registeredDeviceId || '—'}
                  {bus.driver.registeredDeviceId && (
                    <button
                      className="copy-button"
                      onClick={() => handleCopy(bus.driver.registeredDeviceId, 'deviceId')}
                      aria-label="Copy device ID"
                    >
                      {copiedId === 'deviceId' ? '✓' : renderIcon(Copy, { size: 14 })}
                    </button>
                  )}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Firebase Linked</span>
                <span className="detail-value">
                  <Badge variant={bus.driver.firebaseLinked ? 'success' : 'neutral'}>
                    {bus.driver.firebaseLinked ? 'Yes' : 'No'}
                  </Badge>
                </span>
              </div>
            </section>
          )}

          {bus.assignment && (
            <section className="drawer-section">
              <h4 className="section-title">
                {renderIcon(ClipboardList, { size: 16 })}
                Assignment Information
              </h4>
              <div className="detail-row">
                <span className="detail-label">From</span>
                <span className="detail-value">{bus.assignment.from || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Via</span>
                <span className="detail-value">{bus.assignment.via || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">To</span>
                <span className="detail-value">{bus.assignment.to || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Route Name</span>
                <span className="detail-value">{bus.assignment.routeName || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Route ID</span>
                <span className="detail-value">{bus.assignment.routeId || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Scheduled Date</span>
                <span className="detail-value">{bus.assignment.scheduledDate || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Scheduled Departure</span>
                <span className="detail-value">{bus.assignment.scheduledDepartureTime || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value">
                  <Badge variant={getBadgeVariant(bus.assignment.status?.toUpperCase())}>
                    {bus.assignment.status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </span>
              </div>
            </section>
          )}

          <section className="drawer-section">
            <h4 className="section-title">
              {renderIcon(MapPin, { size: 16 })}
              Tracking Information
            </h4>
            <div className="detail-row">
              <span className="detail-label">Tracking Status</span>
              <span className="detail-value">
                <Badge variant={getBadgeVariant((bus.tracking?.status || 'unknown').toUpperCase())}>
                  {(bus.tracking?.status || 'unknown').toUpperCase()}
                </Badge>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Tracking Source</span>
              <span className="detail-value">{bus.tracking?.trackingSource || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Freshness</span>
              <span className="detail-value">
                <Badge variant={getBadgeVariant(bus.freshness?.state?.toUpperCase())}>
                  {bus.freshness?.state || 'UNKNOWN'}
                </Badge>
                {bus.freshness?.ageSeconds !== null && (
                  <span className="detail-sub"> ({bus.freshness.ageSeconds}s ago)</span>
                )}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Latitude</span>
              <span className="detail-value detail-value-mono">
                {bus.tracking?.latitude !== null ? bus.tracking.latitude : '—'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Longitude</span>
              <span className="detail-value detail-value-mono">
                {bus.tracking?.longitude !== null ? bus.tracking.longitude : '—'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Accuracy</span>
              <span className="detail-value detail-value-mono">
                {bus.tracking?.accuracy !== null ? `${bus.tracking.accuracy}m` : '—'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Speed</span>
              <span className="detail-value detail-value-mono">
                {bus.tracking?.speed !== null ? `${bus.tracking.speed} km/h` : '—'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Route</span>
              <span className="detail-value">{bus.tracking?.route || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Last Updated</span>
              <span className="detail-value detail-value-mono">
                {formatTimestamp(bus.tracking?.lastUpdated)}
              </span>
            </div>
          </section>

          {bus.operationalState && (
            <section className="drawer-section">
              <h4 className="section-title">
                {renderIcon(Activity, { size: 16 })}
                Operational State
              </h4>
              <div className="detail-row">
                <span className="detail-label">Bus State</span>
                <span className="detail-value">
                  <Badge variant={getBadgeVariant(bus.operationalState.busState?.toUpperCase())}>
                    {bus.operationalState.busState || '—'}
                  </Badge>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tracking State</span>
                <span className="detail-value">{bus.operationalState.trackingState || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tracking Source</span>
                <span className="detail-value">{bus.operationalState.trackingSource || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Assignment State</span>
                <span className="detail-value">{bus.operationalState.assignmentState || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Driver State</span>
                <span className="detail-value">{bus.operationalState.driverState || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Location State</span>
                <span className="detail-value">{bus.operationalState.locationState || '—'}</span>
              </div>
            </section>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default React.memo(BusDrawer);

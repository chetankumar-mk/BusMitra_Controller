import React, { useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { Bus, User, MapPin, Clock, Activity, Smartphone, Link as LinkIcon, Copy, ExternalLink } from 'lucide-react';
import { renderIcon } from '../ui/renderIcon';
import { 
  isStale, 
  isOnline, 
  hasValidGps, 
  getFreshnessAge, 
  formatFreshnessAge,
  getBusDisplayName,
  getDriverDisplayName,
  getRouteDisplay
} from '../../utils/fleet';
import './BusDetailsPanel.css';

const DetailRow = ({ icon, label, value, onCopy, copyValue }) => {
  const { success } = useToast();

  const handleCopy = async () => {
    const textToCopy = copyValue || value;
    try {
      await navigator.clipboard.writeText(textToCopy);
      success('Copied to clipboard');
    } catch (err) {
      // Fail silently
    }
  };

  const shouldShowCopy = onCopy && value && value !== '—';

  return (
    <div className="detail-row">
      <span className="detail-label">
        {icon && <span className="detail-icon">{renderIcon(icon, { size: 14 })}</span>}
        {label}
      </span>
      <span className="detail-value">
        {value}
        {shouldShowCopy && (
          <button 
            className="detail-copy" 
            onClick={handleCopy}
            type="button"
            aria-label="Copy"
          >
            {renderIcon(Copy, { size: 14 })}
          </button>
        )}
      </span>
    </div>
  );
};

const BusDetailsPanel = ({ bus }) => {
  // Build Google Maps URL
  const googleMapsUrl = hasValidGps(bus) 
    ? `https://www.google.com/maps?q=${bus.tracking.latitude},${bus.tracking.longitude}`
    : null;

  if (!bus) {
    return (
      <div className="bus-details-panel">
        <div className="panel-empty-state">
          <EmptyState
            icon={Bus}
            title="No bus selected"
            description="Select a bus from the list to view its details"
          />
        </div>
      </div>
    );
  }

  // Build Google Maps URL
  if (hasValidGps(bus)) {
    const lat = bus.tracking.latitude;
    const lng = bus.tracking.longitude;
    setGoogleMapsUrl(`https://www.google.com/maps?q=${lat},${lng}`);
  }

  const getBadgeVariant = (status) => {
    const variantMap = {
      'ONLINE': 'success',
      'OFFLINE': 'offline',
      'ACTIVE': 'success',
      'INACTIVE': 'neutral',
      'ASSIGNED': 'info',
      'UNASSIGNED': 'neutral',
      'UNKNOWN': 'neutral',
      'STALE': 'warning',
    };
    return variantMap[status?.toUpperCase()] || 'neutral';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="bus-details-panel">
      <div className="details-header">
        <h2 className="details-title">{getBusDisplayName(bus)}</h2>
        <Badge variant={isOnline(bus) ? 'success' : 'offline'}>
          {isOnline(bus) ? 'Online' : 'Offline'}
        </Badge>
      </div>

      <div className="details-content">
        {/* Bus Information */}
        <div className="details-section">
          <h3 className="section-title">
            {renderIcon(Bus, { size: 16 })}
            Bus Information
          </h3>
          <DetailRow 
            icon={Bus} 
            label="Bus ID" 
            value={bus.busId || '—'}
            onCopy
          />
          <DetailRow 
            icon={Bus} 
            label="Bus Number" 
            value={bus.busNumber || '—'}
            onCopy
          />
        </div>

        {/* Driver Information */}
        <div className="details-section">
          <h3 className="section-title">
            {renderIcon(User, { size: 16 })}
            Driver
          </h3>
          {bus.driver ? (
            <>
              <DetailRow 
                icon={User} 
                label="Driver ID" 
                value={bus.driver.driverId || '—'}
                onCopy
              />
              <DetailRow 
                icon={User} 
                label="Driver Name" 
                value={bus.driver.driverName || '—'}
              />
              <DetailRow 
                icon={Smartphone} 
                label="Device ID" 
                value={bus.driver.registeredDeviceId || '—'}
                onCopy
              />
              <DetailRow 
                icon={LinkIcon} 
                label="Firebase Linked" 
                value={bus.driver.firebaseLinked ? 'Yes' : 'No'}
              />
            </>
          ) : (
            <div className="detail-empty">No driver assigned</div>
          )}
        </div>

        {/* Assignment */}
        <div className="details-section">
          <h3 className="section-title">
            {renderIcon(MapPin, { size: 16 })}
            Assignment
          </h3>
          {bus.assignment ? (
            <>
              <DetailRow 
                icon={MapPin} 
                label="Route" 
                value={bus.assignment.routeName || '—'}
              />
              <DetailRow 
                icon={MapPin} 
                label="Route ID" 
                value={bus.assignment.routeId || '—'}
                onCopy
              />
              <DetailRow 
                icon={MapPin} 
                label="From" 
                value={bus.assignment.from || '—'}
              />
              {bus.assignment.via && (
                <DetailRow 
                  icon={MapPin} 
                  label="Via" 
                  value={bus.assignment.via}
                />
              )}
              <DetailRow 
                icon={MapPin} 
                label="To" 
                value={bus.assignment.to || '—'}
              />
              <DetailRow 
                label="Status" 
                value={
                  <Badge variant={getBadgeVariant(bus.assignment.status)}>
                    {bus.assignment.status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                }
              />
            </>
          ) : (
            <div className="detail-empty">No assignment</div>
          )}
        </div>

        {/* Tracking */}
        <div className="details-section">
          <h3 className="section-title">
            {renderIcon(Activity, { size: 16 })}
            Tracking
          </h3>
          <DetailRow 
            label="Status" 
            value={
              <Badge variant={isOnline(bus) ? 'success' : 'offline'}>
                {isOnline(bus) ? 'ONLINE' : 'OFFLINE'}
              </Badge>
            }
          />
          <DetailRow 
            label="Tracking Source" 
            value={bus.tracking?.trackingSource || '—'}
          />
          <DetailRow 
            icon={MapPin} 
            label="Location" 
            value={hasValidGps(bus) 
              ? `${bus.tracking.latitude.toFixed(6)}, ${bus.tracking.longitude.toFixed(6)}`
              : 'No GPS'
            }
            onCopy={hasValidGps(bus)}
            copyValue={hasValidGps(bus) ? `${bus.tracking.latitude},${bus.tracking.longitude}` : ''}
          />
          {hasValidGps(bus) && googleMapsUrl && (
            <div className="detail-row">
              <span className="detail-label"></span>
              <span className="detail-value">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="maps-link"
                >
                  {renderIcon(ExternalLink, { size: 14 })}
                  Open in Google Maps
                </a>
              </span>
            </div>
          )}
          <DetailRow 
            icon={Clock} 
            label="Last Update" 
            value={formatTimestamp(bus.tracking?.lastUpdated)}
          />
          <DetailRow 
            icon={Clock} 
            label="Freshness" 
            value={
              <span className="freshness-display">
                <span 
                  className="freshness-dot" 
                  style={{ backgroundColor: isStale(bus) ? 'var(--color-warning)' : 'var(--color-success)' }}
                />
                {isStale(bus) ? 'Stale' : 'Fresh'}
                {getFreshnessAge(bus) !== null && ` (${formatFreshnessAge(bus)})`}
              </span>
            }
          />
        </div>

        {/* Operational State */}
        <div className="details-section">
          <h3 className="section-title">
            {renderIcon(Activity, { size: 16 })}
            Operational State
          </h3>
          {bus.operationalState ? (
            <>
              <DetailRow 
                label="Bus State" 
                value={
                  <Badge variant={getBadgeVariant(bus.operationalState.busState)}>
                    {bus.operationalState.busState?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                }
              />
              <DetailRow 
                label="Tracking State" 
                value={
                  <Badge variant={getBadgeVariant(bus.operationalState.trackingState)}>
                    {bus.operationalState.trackingState?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                }
              />
            </>
          ) : (
            <div className="detail-empty">No operational state data</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(BusDetailsPanel);

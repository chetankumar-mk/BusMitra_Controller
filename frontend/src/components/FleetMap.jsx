import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize, Crosshair, Route, Maximize2 } from 'lucide-react';
import { renderIcon } from './ui/renderIcon';
import './FleetMap.css';

/**
 * Component to fix map resize issues
 */
const MapResizeFix = () => {
  const map = useMap();
  const wrapperRef = useRef(null);

  useEffect(() => {
    const invalidateSize = () => {
      map.invalidateSize();
    };

    // Initial invalidation after mount
    const timeout1 = setTimeout(invalidateSize, 0);
    const timeout2 = setTimeout(invalidateSize, 250);

    // Invalidate on window resize
    window.addEventListener('resize', invalidateSize);

    // ResizeObserver on the map container
    const resizeObserver = new ResizeObserver(() => {
      invalidateSize();
    });

    const mapContainer = map.getContainer();
    if (mapContainer) {
      resizeObserver.observe(mapContainer);
    }

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      window.removeEventListener('resize', invalidateSize);
      resizeObserver.disconnect();
    };
  }, [map]);

  return null;
};

/**
 * Component to fit map bounds to markers - only on first load or when triggered
 */
const MapBounds = ({ buses, shouldFit, onFitComplete }) => {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (!shouldFit && hasFittedRef.current) return;

    const busesWithValidGps = buses.filter(bus => 
      bus.tracking && 
      bus.tracking.latitude !== null && 
      bus.tracking.latitude !== undefined &&
      bus.tracking.longitude !== null && 
      bus.tracking.longitude !== undefined &&
      bus.tracking.latitude >= -90 && 
      bus.tracking.latitude <= 90 &&
      bus.tracking.longitude >= -180 && 
      bus.tracking.longitude <= 180
    );

    if (busesWithValidGps.length > 0) {
      const bounds = L.latLngBounds(
        busesWithValidGps.map(bus => [bus.tracking.latitude, bus.tracking.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
      hasFittedRef.current = true;
      onFitComplete?.();
    }
  }, [buses, shouldFit, map, onFitComplete]);

  return null;
};

/**
 * FleetMap Component
 * Displays buses on a map using GPS coordinates from the Controller backend
 */
const FleetMap = forwardRef(({ 
  buses, 
  onBusSelect, 
  onBusView, 
  variant = 'card',
  selectedBusId = null,
  trails = {},
  showTrails = false,
  followSelected = false
}, ref) => {
  const mapRef = useRef(null);
  const [shouldFit, setShouldFit] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Expose flyToBus method via ref
  useImperativeHandle(ref, () => ({
    flyToBus: (busId) => {
      const bus = buses.find(b => b.busId === busId);
      if (!bus) return false;
      
      if (!bus.tracking?.latitude || !bus.tracking?.longitude) {
        return false; // No GPS
      }

      const map = mapRef.current;
      if (map) {
        map.flyTo([bus.tracking.latitude, bus.tracking.longitude], Math.max(map.getZoom(), 14));
        return true;
      }
      return false;
    }
  }), [buses]);

  // Follow selected bus when enabled
  useEffect(() => {
    if (!followSelected || !selectedBusId) return;

    const bus = buses.find(b => b.busId === selectedBusId);
    if (!bus || !bus.tracking?.latitude || !bus.tracking?.longitude) return;

    const map = mapRef.current;
    if (map) {
      const currentZoom = map.getZoom();
      map.panTo([bus.tracking.latitude, bus.tracking.longitude], { animate: true });
    }
  }, [followSelected, selectedBusId, buses]);

  // Validate GPS coordinates
  const isValidGps = (lat, lng) => {
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
      return false;
    }
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  // Filter buses with valid GPS
  const busesWithValidGps = buses.filter(bus => 
    bus.tracking && isValidGps(bus.tracking.latitude, bus.tracking.longitude)
  );

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleString();
  };

  // Handle marker click
  const handleMarkerClick = (bus) => {
    if (onBusSelect) {
      onBusSelect(bus);
    }
  };

  // Get marker color based on operational state - mapped to tokens
  const getMarkerColor = (bus) => {
    if (!bus.operationalState) return 'var(--color-neutral-400)';
    
    const { busState, trackingState } = bus.operationalState;
    
    if (busState === 'ONLINE' && trackingState === 'ACTIVE') {
      return 'var(--color-success)';
    } else if (busState === 'ONLINE') {
      return 'var(--color-warning)';
    } else if (trackingState === 'ACTIVE') {
      return 'var(--color-info)';
    }
    return 'var(--color-neutral-400)';
  };

  // Create custom marker icon using CSS
  const createCustomIcon = useCallback((bus) => {
    const color = getMarkerColor(bus);
    const isOnline = bus.tracking?.isOnline;
    const isStale = bus.freshness?.state === 'STALE';
    const isDimmed = !isOnline || isStale;
    const isSelected = bus.busId === selectedBusId;
    const size = isSelected ? 40 : 32;
    const iconAnchor = isSelected ? [20, 40] : [16, 32];
    const popupAnchor = isSelected ? [0, -40] : [0, -32];

    return L.divIcon({
      className: `custom-marker ${isSelected ? 'marker-selected' : ''}`,
      html: `
        <div class="marker-pin ${isDimmed ? 'marker-dimmed' : ''} ${isSelected ? 'marker-highlighted' : ''}" style="background-color: ${color}; width: ${size}px; height: ${size}px;">
          ${isOnline && !isStale ? '<div class="marker-pulse"></div>' : ''}
          <span class="marker-number" style="font-size: ${isSelected ? '14px' : '12px'};">${bus.busNumber || '?'}</span>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor,
      popupAnchor,
      zIndexOffset: isSelected ? 1000 : 0,
    });
  }, [selectedBusId]);

  // Handle fit bounds button
  const handleFitBounds = useCallback(() => {
    setShouldFit(true);
  }, []);

  // Handle fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  // Invalidate map size when fullscreen toggles
  useEffect(() => {
    if (mapRef.current) {
      const timeout = setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isFullscreen]);

  return (
    <div className={`fleet-map-container ${isFullscreen ? 'map-fullscreen' : ''} ${variant === 'embedded' ? 'map-embedded' : ''}`}>
      {variant === 'card' && (
        <>
          <div className="fleet-map-header">
            <h3>Fleet Map</h3>
            <div className="map-controls">
              <button
                className="map-control-btn"
                onClick={handleFitBounds}
                type="button"
                aria-label="Fit all buses"
              >
                Fit all buses
              </button>
              <button
                className="map-control-btn"
                onClick={handleFullscreenToggle}
                type="button"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              </button>
            </div>
          </div>
          
          <div className="map-legend">
            <span className="legend-item">
              <span className="legend-dot legend-online-active"></span>
              <span>Online & Active</span>
            </span>
            <span className="legend-item">
              <span className="legend-dot legend-online"></span>
              <span>Online</span>
            </span>
            <span className="legend-item">
              <span className="legend-dot legend-active"></span>
              <span>Active</span>
            </span>
            <span className="legend-item">
              <span className="legend-dot legend-offline"></span>
              <span>Offline/Inactive</span>
            </span>
          </div>
        </>
      )}
      
      {variant === 'embedded' && (
        <div className="map-toolbar-embedded">
          <button
            className="toolbar-btn"
            onClick={handleFitBounds}
            type="button"
            aria-label="Fit all buses"
            title="Fit all buses"
          >
            {renderIcon(Maximize, { size: 16 })}
          </button>
          <button
            className={`toolbar-btn ${followSelected ? 'toolbar-btn-active' : ''}`}
            onClick={() => onBusView?.({ toggleFollow: true })}
            type="button"
            aria-label="Follow selected"
            aria-pressed={followSelected}
            title="Follow selected"
          >
            {renderIcon(Crosshair, { size: 16 })}
          </button>
          <button
            className={`toolbar-btn ${showTrails ? 'toolbar-btn-active' : ''}`}
            onClick={() => onBusView?.({ toggleTrails: true })}
            type="button"
            aria-label="Toggle trails"
            aria-pressed={showTrails}
            title="Toggle trails"
          >
            {renderIcon(Route, { size: 16 })}
          </button>
          <button
            className="toolbar-btn"
            onClick={handleFullscreenToggle}
            type="button"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {renderIcon(Maximize2, { size: 16 })}
          </button>
        </div>
      )}

      {variant === 'embedded' && (
        <div className="map-legend-embedded">
          <span className="legend-item">
            <span className="legend-dot legend-online-active"></span>
            <span>Online & Active</span>
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-online"></span>
            <span>Online</span>
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-offline"></span>
            <span>Offline</span>
          </span>
        </div>
      )}
      
      <div className="map-wrapper">
        <MapContainer
          ref={mapRef}
          center={[15.9129, 74.479]} // Default center (Hubli area)
          zoom={10}
          className="fleet-map"
          zoomControl={false}
        >
          <MapResizeFix />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles"
          />
          <ZoomControl position="topright" />
          <MapBounds 
            buses={buses} 
            shouldFit={shouldFit}
            onFitComplete={() => setShouldFit(false)}
          />
          
          {/* Render trails if enabled */}
          {showTrails && Object.entries(trails).map(([busId, positions]) => {
            const bus = buses.find(b => b.busId === busId);
            if (!bus || !positions || positions.length < 2) return null;
            const isSelected = busId === selectedBusId;
            return (
              <Polyline
                key={`trail-${busId}`}
                positions={positions}
                color={isSelected ? 'var(--color-brand-primary)' : 'var(--color-neutral-400)'}
                weight={isSelected ? 4 : 2}
                opacity={isSelected ? 0.8 : 0.5}
                className="trail-line"
              />
            );
          })}
          
          {busesWithValidGps.map(bus => (
            <Marker
              key={bus.busId}
              position={[bus.tracking.latitude, bus.tracking.longitude]}
              icon={createCustomIcon(bus)}
              eventHandlers={{
                click: () => handleMarkerClick(bus)
              }}
            >
              <Popup className="marker-popup">
                <div className="marker-popup-content">
                  <h4>Bus {bus.busNumber || bus.busId}</h4>
                  <div className="popup-info">
                    <strong>Bus ID:</strong> {bus.busId}
                  </div>
                  {bus.driver && (
                    <div className="popup-info">
                      <strong>Driver:</strong> {bus.driver.driverName || 'Unknown'}
                      <br />
                      <strong>Driver ID:</strong> {bus.driver.driverId || '—'}
                    </div>
                  )}
                  {!bus.driver && (
                    <div className="popup-info">
                      <strong>Driver:</strong> —
                    </div>
                  )}
                  {bus.assignment && (
                    <div className="popup-info">
                      <strong>Assignment:</strong> {bus.assignment.status || 'Unknown'}
                      <br />
                      <strong>Route:</strong> {bus.assignment.routeName || bus.assignment.routeId || (bus.assignment.from && `${bus.assignment.from} → ${bus.assignment.via ? bus.assignment.via + ' → ' : ''}${bus.assignment.to}`) || '—'}
                    </div>
                  )}
                  {!bus.assignment && (
                    <div className="popup-info">
                      <strong>Assignment:</strong> Unassigned
                    </div>
                  )}
                  <div className="popup-info">
                    <strong>Tracking Status:</strong> {(bus.tracking.status || 'unknown').toUpperCase()}
                  </div>
                  <div className="popup-info">
                    <strong>Tracking Source:</strong> {bus.tracking.trackingSource || '—'}
                  </div>
                  {bus.freshness && (
                    <div className="popup-info">
                      <strong>Freshness:</strong> {bus.freshness.state || 'UNKNOWN'}
                      {bus.freshness.ageSeconds !== null && ` (${bus.freshness.ageSeconds}s ago)`}
                    </div>
                  )}
                  <div className="popup-info">
                    <strong>Last Updated:</strong> {formatTimestamp(bus.tracking.lastUpdated)}
                  </div>
                  {bus.operationalState && (
                    <div className="popup-info">
                      <strong>Bus State:</strong> {bus.operationalState.busState || '—'}
                      <br />
                      <strong>Tracking State:</strong> {bus.operationalState.trackingState || '—'}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {busesWithValidGps.length === 0 && (
          <div className="no-gps-overlay">
            <p>No buses with valid GPS location</p>
            <p className="no-gps-subtext">Bus markers will appear when the Driver App reports GPS coordinates</p>
          </div>
        )}
      </div>
    </div>
  );
});

FleetMap.displayName = 'FleetMap';

export default FleetMap;

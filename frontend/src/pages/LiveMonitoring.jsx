import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { apiClient } from '../api/apiClient';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton, SkeletonCircle } from '../components/ui/Skeleton';
import MonitoringHeader from '../components/monitoring/MonitoringHeader';
import FleetPanel from '../components/monitoring/FleetPanel';
import BusDetailsPanel from '../components/monitoring/BusDetailsPanel';
import ActivityFeed from '../components/monitoring/ActivityFeed';
import FleetMap from '../components/FleetMap';
import { isStale, isOnline, isActivelyTracking, hasValidGps } from '../utils/fleet';
import './LiveMonitoring.css';

const LiveMonitoring = () => {
  const [fleet, setFleet] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [pollError, setPollError] = useState(null);
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showTrails, setShowTrails] = useState(false);
  const [followSelected, setFollowSelected] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const mapRef = useRef(null);
  const intervalRef = useRef(null);
  const trailsRef = useRef({});

  // Load panel state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('busmitra-monitor-panel');
      if (saved !== null) {
        setPanelCollapsed(saved === 'collapsed');
      }
    } catch (e) {
      // Fail silently
    }
  }, []);

  // Save panel state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('busmitra-monitor-panel', panelCollapsed ? 'collapsed' : 'expanded');
    } catch (e) {
      // Fail silently
    }
  }, [panelCollapsed]);

  // Fetch fleet data
  const fetchFleetData = useCallback(async () => {
    if (isPaused) return;

    try {
      const response = await apiClient.get('/api/controller/operations/fleet');
      const buses = response.buses || [];
      setFleet(buses);
      setLastUpdate(Date.now());
      setLastSuccessfulFetch(Date.now());
      setPollError(null);
      setLoading(false);

      // Update trails with new positions
      buses.forEach(bus => {
        if (hasValidGps(bus)) {
          const busId = bus.busId;
          const position = [bus.tracking.latitude, bus.tracking.longitude];
          
          if (!trailsRef.current[busId]) {
            trailsRef.current[busId] = [];
          }
          
          const lastPosition = trailsRef.current[busId][trailsRef.current[busId].length - 1];
          if (!lastPosition || 
              lastPosition[0] !== position[0] || 
              lastPosition[1] !== position[1]) {
            trailsRef.current[busId].push(position);
            // Keep only last 25 positions
            if (trailsRef.current[busId].length > 25) {
              trailsRef.current[busId] = trailsRef.current[busId].slice(-25);
            }
          }
        }
      });
    } catch (error) {
      console.error('Failed to fetch fleet data:', error);
      if (lastSuccessfulFetch) {
        setPollError('Connection issue. Showing last data.');
      } else {
        setError('Unable to load fleet data');
        setLoading(false);
      }
    }
  }, [isPaused, lastSuccessfulFetch]);

  // Initial fetch and polling
  useEffect(() => {
    fetchFleetData();
    
    intervalRef.current = setInterval(() => {
      fetchFleetData();
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchFleetData]);

  // Handle pause/resume
  const handlePauseToggle = useCallback(() => {
    setIsPaused(prev => {
      const newValue = !prev;
      if (!newValue) {
        // Resume - fetch immediately
        fetchFleetData();
      }
      return newValue;
    });
  }, [fetchFleetData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchFleetData();
  }, [fetchFleetData]);

  // Compute stats
  const stats = useMemo(() => {
    if (!fleet || fleet.length === 0) {
      return { online: 0, offline: 0, activeTracking: 0, stale: 0 };
    }
    return {
      online: fleet.filter(b => isOnline(b)).length,
      offline: fleet.filter(b => !isOnline(b)).length,
      activeTracking: fleet.filter(b => isActivelyTracking(b)).length,
      stale: fleet.filter(b => isStale(b)).length,
    };
  }, [fleet]);

  // Get selected bus from latest fleet
  const selectedBus = useMemo(() => {
    if (!selectedBusId) return null;
    return fleet.find(b => b.busId === selectedBusId) || null;
  }, [fleet, selectedBusId]);

  // Handle bus selection
  const handleBusSelect = useCallback((busId) => {
    setSelectedBusId(busId);
    if (busId && mapRef.current) {
      mapRef.current.flyToBus(busId);
    }
  }, []);

  // Handle fit all
  const handleFitAll = useCallback(() => {
    // FleetMap will handle this via its internal fit bounds
  }, []);

  // Handle map toolbar actions
  const handleMapAction = useCallback((action) => {
    if (action.toggleFollow) {
      setFollowSelected(prev => !prev);
    }
    if (action.toggleTrails) {
      setShowTrails(prev => !prev);
    }
  }, []);

  // Handle stat chip click
  const handleStatClick = useCallback((filter) => {
    setActiveFilter(filter);
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
  }, []);

  // First load skeleton
  if (loading) {
    return (
      <div className="live-monitoring-page">
        <MonitoringHeader
          isLive={false}
          lastUpdate={null}
          isPaused={false}
          onPauseToggle={() => {}}
          onRefresh={() => {}}
          stats={{ online: 0, offline: 0, activeTracking: 0, stale: 0 }}
          onStatClick={() => {}}
          activeFilter="all"
        />
        <div className="monitoring-content">
          <div className="fleet-panel-skeleton">
            <Skeleton height={40} width="100%" />
            <Skeleton height={200} width="100%" />
          </div>
          <div className="map-skeleton">
            <SkeletonCircle size="100%" />
          </div>
          <div className="panel-skeleton">
            <Skeleton height={40} width="100%" />
            <Skeleton height={200} width="100%" />
          </div>
        </div>
      </div>
    );
  }

  // First load error
  if (error && !lastSuccessfulFetch) {
    return (
      <div className="live-monitoring-page">
        <MonitoringHeader
          isLive={false}
          lastUpdate={null}
          isPaused={false}
          onPauseToggle={() => {}}
          onRefresh={handleRefresh}
          stats={{ online: 0, offline: 0, activeTracking: 0, stale: 0 }}
          onStatClick={() => {}}
          activeFilter="all"
        />
        <div className="monitoring-content">
          <ErrorState
            title="Unable to load fleet data"
            description="There was a problem fetching the fleet data. Please try again."
            action={<button onClick={handleRefresh} className="retry-btn">Retry</button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="live-monitoring-page">
      {/* Poll error banner */}
      {pollError && lastSuccessfulFetch && (
        <div className="poll-error-banner">
          <span className="poll-error-icon">⚠</span>
          <span className="poll-error-text">
            {pollError} Last successful: {new Date(lastSuccessfulFetch).toLocaleTimeString()}. Retrying...
          </span>
          <button 
            className="poll-error-close" 
            onClick={() => setPollError(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <MonitoringHeader
        isLive={!pollError}
        lastUpdate={lastUpdate}
        isPaused={isPaused}
        onPauseToggle={handlePauseToggle}
        onRefresh={handleRefresh}
        stats={stats}
        onStatClick={handleStatClick}
        activeFilter={activeFilter}
      />

      <div className="monitoring-content">
        <FleetPanel
          fleet={fleet}
          selectedBusId={selectedBusId}
          onBusSelect={handleBusSelect}
          onFitAll={handleFitAll}
          onFilterChange={handleFilterChange}
          activeFilter={activeFilter}
        />

        <div className="map-section">
          <FleetMap
            ref={mapRef}
            buses={fleet}
            variant="embedded"
            selectedBusId={selectedBusId}
            trails={trailsRef.current}
            showTrails={showTrails}
            followSelected={followSelected}
            onBusView={handleMapAction}
          />
        </div>

        <div className={`right-panel ${panelCollapsed ? 'right-panel-collapsed' : ''}`}>
          <button 
            className="panel-toggle"
            onClick={() => setPanelCollapsed(prev => !prev)}
            type="button"
            aria-label={panelCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {panelCollapsed ? '◀' : '▶'}
          </button>

          {!panelCollapsed && (
            <>
              <div className="panel-tabs">
                <button
                  className={`panel-tab ${activeTab === 'details' ? 'panel-tab-active' : ''}`}
                  onClick={() => setActiveTab('details')}
                  type="button"
                >
                  Bus Details
                </button>
                <button
                  className={`panel-tab ${activeTab === 'activity' ? 'panel-tab-active' : ''}`}
                  onClick={() => setActiveTab('activity')}
                  type="button"
                >
                  Activity
                </button>
              </div>

              {activeTab === 'details' && (
                <BusDetailsPanel bus={selectedBus} />
              )}

              {activeTab === 'activity' && (
                <ActivityFeed fleet={fleet} onBusSelect={handleBusSelect} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;

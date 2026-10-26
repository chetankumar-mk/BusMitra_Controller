import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/apiClient';
import { getCurrentUser } from '../api/auth';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton, SkeletonCircle } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../components/ui/Toast';
import { RefreshCw, Activity } from 'lucide-react';
import FleetMap from '../components/FleetMap';
import KpiRow from '../components/dashboard/KpiRow';
import FleetDonut from '../components/dashboard/FleetDonut';
import AttentionList from '../components/dashboard/AttentionList';
import SessionTrend from '../components/dashboard/SessionTrend';
import FleetTable from '../components/dashboard/FleetTable';
import BusDrawer from '../components/dashboard/BusDrawer';
import './Dashboard.css';

// Lightweight timer component for "Updated Xs ago"
const UpdateTimer = ({ lastUpdateTime }) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const update = () => {
      if (!lastUpdateTime) {
        setTimeAgo('—');
        return;
      }
      const now = Date.now();
      const diff = Math.floor((now - lastUpdateTime) / 1000);
      
      if (diff < 60) setTimeAgo(`${diff}s ago`);
      else if (diff < 3600) setTimeAgo(`${Math.floor(diff / 60)}m ago`);
      else if (diff < 86400) setTimeAgo(`${Math.floor(diff / 3600)}h ago`);
      else setTimeAgo(`${Math.floor(diff / 86400)}d ago`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lastUpdateTime]);

  return <span>{timeAgo}</span>;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [summary, setSummary] = useState(null);
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBus, setSelectedBus] = useState(null);
  const [user, setUser] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [pollError, setPollError] = useState(null);
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState(null);
  const [tableFilter, setTableFilter] = useState('all');
  const [onlineHistory, setOnlineHistory] = useState([]);
  const isFirstLoad = useRef(true);
  const mapRef = useRef(null);

  // Session trend: keep last 30 polls of onlineBuses
  useEffect(() => {
    if (summary?.onlineBuses !== undefined) {
      setOnlineHistory(prev => {
        const newHistory = [...prev, summary.onlineBuses];
        if (newHistory.length > 30) newHistory.shift();
        return newHistory;
      });
    }
  }, [summary?.onlineBuses]);

  // Reset online history on unmount
  useEffect(() => {
    return () => {
      setOnlineHistory([]);
    };
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await getCurrentUser();
      if (response.success) {
        setUser(response.user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsFetching(true);
      
      const [summaryResponse, fleetResponse] = await Promise.all([
        apiClient.get('/api/controller/operations/summary'),
        apiClient.get('/api/controller/operations/fleet')
      ]);

      setSummary(summaryResponse.summary);
      setFleet(fleetResponse.buses || []);
      setLoading(false);
      setPollError(null);
      setLastSuccessfulFetch(Date.now());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      
      if (isFirstLoad.current) {
        setError('Controller backend unavailable');
        setLoading(false);
      } else {
        // Later poll failure: show banner, keep last data
        setPollError('Connection issue');
      }
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchUserData();
    
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchDashboardData]);

  useEffect(() => {
    isFirstLoad.current = false;
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchDashboardData();
  };

  const handleKpiClick = (kpiType) => {
    if (kpiType === 'assignments') {
      navigate('/assignments');
    } else {
      // Set table filter and scroll to table
      setTableFilter(kpiType);
      document.getElementById('fleet-table-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBusView = useCallback((bus) => {
    if (!bus) return;
    
    if (!bus.tracking?.latitude || !bus.tracking?.longitude) {
      toastError('This bus has no GPS location');
      return;
    }

    if (mapRef.current) {
      const success = mapRef.current.flyToBus(bus.busId);
      if (success) {
        setSelectedBus(null); // Close drawer
      } else {
        toastError('Could not locate bus on map');
      }
    }
  }, [toastError]);

  const gpsCoverage = useMemo(() => {
    const withGps = fleet.filter(b => b.tracking?.latitude && b.tracking?.longitude).length;
    const withoutGps = fleet.length - withGps;
    return { withGps, withoutGps };
  }, [fleet]);

  if (loading) {
    return (
      <div className="dashboard">
        <PageHeader
          title="Dashboard"
          subtitle="Fleet and operations overview"
          actions={
            <div className="header-actions">
              <SkeletonCircle size={32} />
              <Skeleton variant="rect" width={120} height={24} />
            </div>
          }
        />
        <div className="dashboard-content">
          <div className="kpi-row">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="rect" height={140} />
            ))}
          </div>
          <div className="dashboard-grid">
            <div className="map-section">
              <Skeleton variant="rect" height={520} />
            </div>
            <div className="sidebar-section">
              <Skeleton variant="rect" height={300} />
            </div>
          </div>
          <Skeleton variant="rect" height={400} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <PageHeader
          title="Dashboard"
          subtitle="Fleet and operations overview"
          actions={
            <div className="header-actions">
              <SkeletonCircle size={32} />
              <Skeleton variant="rect" width={120} height={24} />
            </div>
          }
        />
        <ErrorState
          message={error}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <PageHeader
        title="Dashboard"
        subtitle="Fleet and operations overview"
        actions={
          <div className="header-actions">
            <Badge variant={pollError ? 'warning' : 'success'}>
              {pollError ? 'Stale' : 'Live'}
            </Badge>
            <span className="update-time">
              Updated <UpdateTimer lastUpdateTime={lastSuccessfulFetch} />
            </span>
            <Button
              icon={RefreshCw}
              size="sm"
              onClick={fetchDashboardData}
              loading={isFetching}
            >
              Refresh
            </Button>
            <Badge variant="neutral">
              {user?.depotName || 'Loading...'}
            </Badge>
          </div>
        }
      />

      {pollError && (
        <div className="poll-error-banner">
          <Activity size={16} />
          <span>
            Connection issue. Showing last data from {new Date(lastSuccessfulFetch).toLocaleTimeString()}. Retrying...
          </span>
        </div>
      )}

      <div className="dashboard-content">
        <KpiRow
          summary={summary}
          fleet={fleet}
          loading={loading}
          onCardClick={handleKpiClick}
        />

        <div className="dashboard-grid">
          <div className="map-section">
            <FleetMap
              buses={fleet}
              onBusSelect={setSelectedBus}
              onBusView={handleBusView}
              ref={mapRef}
            />
          </div>

          <div className="sidebar-section">
            <div className="sidebar-card">
              <FleetDonut fleet={fleet} />
              <div className="gps-coverage">
                <span className="gps-label">GPS coverage</span>
                <span className="gps-value">
                  {gpsCoverage.withGps} / {fleet.length}
                </span>
              </div>
              {onlineHistory.length >= 3 && (
                <SessionTrend onlineHistory={onlineHistory} />
              )}
            </div>
            <AttentionList
              fleet={fleet}
              onBusClick={setSelectedBus}
            />
          </div>
        </div>

        <div id="fleet-table-section" className="table-section">
          <FleetTable
            fleet={fleet}
            onBusClick={setSelectedBus}
            filter={tableFilter}
            onFilterChange={setTableFilter}
          />
        </div>
      </div>

      <BusDrawer
        bus={selectedBus}
        open={!!selectedBus}
        onClose={() => setSelectedBus(null)}
        onViewOnMap={handleBusView}
      />
    </div>
  );
};

export default Dashboard;

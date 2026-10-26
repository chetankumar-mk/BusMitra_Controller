import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import Callout from '../components/ui/Callout';
import CopyButton from '../components/ui/CopyButton';
import { useToast } from '../components/ui/Toast';
import { renderIcon } from '../components/ui/renderIcon';
import { MapPin, ExternalLink, Clock, RefreshCw, Bus, Navigation, Activity, PowerOff } from 'lucide-react';
import { DataTable, TableToolbar, FilterChips, Pagination, useTableState } from '../components/table';
import { exportCsv } from '../utils/csv';
import { formatRelativeAge, formatFullTimestamp } from '../utils/fleet';
import { memoryCache } from '../utils/memoryCache';
import './Buses.css';

const TimeAgo = ({ timestamp }) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (!timestamp) return;
    const update = () => {
      setTimeAgo(formatRelativeAge(timestamp));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timestamp]);

  if (!timestamp) return null;
  return <span className="buses-time-ago">Updated {timeAgo}</span>;
};

const Buses = () => {
  const { success } = useToast();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedBus, setSelectedBus] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshError, setRefreshError] = useState(null);

  const distinctStatuses = useMemo(() => {
    const statuses = new Set(buses.map(b => b.status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [buses]);

  const filterCounts = useMemo(() => {
    const counts = {
      all: buses.length,
      withGps: buses.filter(b => Number.isFinite(b?.lat) && Number.isFinite(b?.lng)).length,
      noGps: buses.filter(b => !Number.isFinite(b?.lat) || !Number.isFinite(b?.lng)).length,
    };
    distinctStatuses.forEach(status => {
      counts[status] = buses.filter(b => b.status === status).length;
    });
    return counts;
  }, [buses, distinctStatuses]);

  const kpiData = useMemo(() => {
    return [
      { 
        key: 'total', 
        label: 'Total Buses', 
        value: buses.length, 
        subText: 'Registered in the system',
        icon: Bus,
        accent: 'primary',
      },
      { 
        key: 'withGps', 
        label: 'With GPS', 
        value: filterCounts.withGps, 
        subText: 'Position available',
        icon: MapPin,
        accent: 'success',
      },
      { 
        key: 'noGps', 
        label: 'No GPS', 
        value: filterCounts.noGps, 
        subText: 'No coordinates reported',
        icon: Navigation,
        accent: 'warning',
      },
      { 
        key: 'active', 
        label: 'Active', 
        value: buses.filter(b => {
          const status = b.status?.toUpperCase();
          return status === 'ACTIVE' || status === 'RUNNING';
        }).length, 
        subText: 'Active or running',
        icon: Activity,
        accent: 'success',
      },
      { 
        key: 'inactive', 
        label: 'Inactive', 
        value: buses.filter(b => b.status?.toUpperCase() === 'INACTIVE').length, 
        subText: 'Not running',
        icon: PowerOff,
        accent: 'neutral',
      },
    ];
  }, [buses, filterCounts]);

  const filterFn = useCallback((rows, activeFilter) => {
    if (activeFilter === 'all') return rows;
    if (activeFilter === 'withGps') return rows.filter(b => Number.isFinite(b?.lat) && Number.isFinite(b?.lng));
    if (activeFilter === 'noGps') return rows.filter(b => !Number.isFinite(b?.lat) || !Number.isFinite(b?.lng));
    return rows.filter(b => b.status === activeFilter);
  }, []);

  const hasValidGps = (bus) => Number.isFinite(bus?.lat) && Number.isFinite(bus?.lng);

  const formatStatusLabel = (status) => {
    if (!status) return 'Unknown';
    // Convert to Title Case: "ACTIVE" -> "Active", "INACTIVE" -> "Inactive"
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const getStatusVariant = (status) => {
    const normalized = status?.toUpperCase();
    if (normalized === 'ACTIVE' || normalized === 'RUNNING') return 'success';
    if (normalized === 'INACTIVE') return 'neutral';
    return 'neutral';
  };

  const columns = [
    {
      id: 'busNumber',
      header: 'Bus Number',
      accessor: (r) => r.busNumber || '—',
      sortable: true,
      sortType: 'string',
      mono: true,
    },
    {
      id: 'busId',
      header: 'Bus ID',
      accessor: (r) => r.busId || '—',
      sortable: true,
      sortType: 'string',
      mono: true,
      cell: (row, value) => (
        <div className="buses-cell-with-copy">
          <span>{value}</span>
          <CopyButton label="Bus ID" value={value} />
        </div>
      ),
    },
    {
      id: 'route',
      header: 'Route',
      accessor: (r) => r.route || (r.from && r.to ? `${r.from} → ${r.to}` : '—'),
      sortable: true,
      sortType: 'string',
      cell: (row, value) => (
        <span className="buses-route-cell" title={value}>
          {value}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Bus Status',
      accessor: (r) => r.status || '—',
      sortable: true,
      sortType: 'string',
      cell: (row, value) => (
        <Badge variant={getStatusVariant(value)}>
          {formatStatusLabel(value)}
        </Badge>
      ),
    },
    {
      id: 'gps',
      header: 'GPS',
      accessor: (r) => hasValidGps(r) ? 'Available' : 'No GPS',
      sortable: true,
      sortType: 'string',
      sortValue: (r) => hasValidGps(r) ? 0 : 1, // Available (0) before No GPS (1)
      cell: (row, value) => (
        <Badge variant={hasValidGps(row) ? 'success' : 'neutral'}>
          {value}
        </Badge>
      ),
    },
    {
      id: 'location',
      header: 'Location',
      accessor: (r) => {
        if (hasValidGps(r)) {
          return `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`;
        }
        return 'Location unavailable';
      },
      sortable: true,
      sortType: 'string',
      mono: true,
      sortValue: (r) => {
        // Sort by latitude (number), invalid GPS returns null (sorts last)
        if (!hasValidGps(r)) return null;
        return r.lat;
      },
      cell: (row, value) => (
        <div className="buses-location-cell">
          <span className={hasValidGps(row) ? '' : 'buses-location-muted'}>
            {value}
          </span>
          {hasValidGps(row) && (
            <a
              href={`https://www.google.com/maps?q=${row.lat},${row.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="buses-maps-link"
              aria-label="Open in Google Maps"
            >
              {renderIcon(ExternalLink, { size: 14 })}
            </a>
          )}
        </div>
      ),
    },
    {
      id: 'lastUpdated',
      header: 'Last Update',
      accessor: (r) => r.lastUpdated,
      sortable: true,
      sortType: 'date',
      sortValue: (r) => r.lastUpdated || 0, // Sort by timestamp, null/missing last
      cell: (row, value) => (
        <span title={formatFullTimestamp(value)}>
          {formatRelativeAge(value)}
        </span>
      ),
    },
  ];

  const tableState = useTableState({
    rows: buses,
    tableKey: 'buses',
    filterFn,
    columns,
  });

  const {
    searchQuery,
    activeFilter,
    sortColumn,
    sortDirection,
    density,
    paginatedRows,
    pagination,
    handleSearch,
    handleFilter,
    handleSort,
    handleDensityChange,
  } = tableState;

  const fetchBuses = useCallback(async (isRefresh = false) => {
    const CACHE_KEY = 'buses-data';
    
    try {
      if (isRefresh) {
        setRefreshing(true);
        setRefreshError(null);
      } else {
        // Check cache first on initial load
        const cached = memoryCache.get(CACHE_KEY);
        if (cached && cached.buses && cached.timestamp) {
          setBuses(cached.buses);
          setLastUpdate(cached.timestamp);
          setLoading(false);
          setError(null);
          // Re-fetch in background
          const response = await apiClient.get('/api/controller/buses');
          setBuses(response.buses || []);
          setLastUpdate(Date.now());
          memoryCache.set(CACHE_KEY, { buses: response.buses || [], timestamp: Date.now() });
          return;
        }
        setLoading(true);
        setError(null);
      }
      
      const response = await apiClient.get('/api/controller/buses');
      setBuses(response.buses || []);
      setLastUpdate(Date.now());
      memoryCache.set(CACHE_KEY, { buses: response.buses || [], timestamp: Date.now() });
      setRefreshError(null);
    } catch (err) {
      console.error('Failed to fetch buses:', err);
      if (isRefresh) {
        setRefreshError('Couldn\'t refresh. Showing data from ' + new Date(lastUpdate).toLocaleTimeString() + '.');
      } else {
        setError('Failed to load buses. Please check if the backend is running.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lastUpdate]);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  const handleKpiClick = (key) => {
    if (key === 'total') {
      handleFilter('all');
    } else if (key === 'withGps') {
      handleFilter('withGps');
    } else if (key === 'noGps') {
      handleFilter('noGps');
    } else if (key === 'active') {
      handleFilter('ACTIVE');
    } else if (key === 'inactive') {
      handleFilter('INACTIVE');
    }
  };

  const handleRowClick = useCallback((bus) => {
    setSelectedBus(bus);
    setDrawerOpen(true);
  }, []);

  const handleExport = useCallback(() => {
    const columns = [
      { id: 'busNumber', header: 'Bus Number', accessor: (r) => r.busNumber },
      { id: 'busId', header: 'Bus ID', accessor: (r) => r.busId },
      { id: 'route', header: 'Route', accessor: (r) => r.route || `${r.from} → ${r.to}` },
      { id: 'status', header: 'Status', accessor: (r) => r.status },
      { id: 'gps', header: 'GPS', accessor: (r) => (Number.isFinite(r?.lat) && Number.isFinite(r?.lng)) ? 'Available' : 'No GPS' },
      { id: 'location', header: 'Location', accessor: (r) => {
        if (Number.isFinite(r?.lat) && Number.isFinite(r?.lng)) {
          return `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`;
        }
        return 'Location unavailable';
      }},
      { id: 'lastUpdated', header: 'Last Update', accessor: (r) => r.lastUpdated ? new Date(r.lastUpdated).toLocaleString() : 'N/A' },
    ];
    const count = exportCsv(columns, tableState.filteredRows, 'busmitra-buses');
    success(`Exported ${count} rows`);
  }, [tableState.filteredRows, success]);

  const getRowId = (row) => row.busId;

  if (loading) {
    return (
      <div className="buses-page">
        <PageHeader
          title="Fleet"
          subtitle="All registered buses and their latest known position"
        />
        <div className="buses-kpi-strip">
          {kpiData.map((kpi) => (
            <StatCard key={kpi.key} loading />
          ))}
        </div>
        <DataTable
          columns={columns}
          rows={[]}
          getRowId={getRowId}
          loading={true}
          density={density}
          caption="Buses table"
        />
      </div>
    );
  }

  if (error && !buses.length) {
    return (
      <div className="buses-page">
        <PageHeader
          title="Fleet"
          subtitle="All registered buses and their latest known position"
        />
        <ErrorState
          message={error}
          onRetry={() => fetchBuses()}
        />
      </div>
    );
  }

  if (!buses.length) {
    return (
      <div className="buses-page">
        <PageHeader
          title="Fleet"
          subtitle="All registered buses and their latest known position"
        />
        <EmptyState
          icon={renderIcon(MapPin, { size: 48 })}
          title="No buses found"
          message="Buses will appear here once they are registered in Firebase."
        />
      </div>
    );
  }

  const resultCount = searchQuery || activeFilter !== 'all'
    ? `${pagination.totalRows} of ${buses.length} buses`
    : `Showing ${pagination.startIndex + 1}-${pagination.endIndex} of ${pagination.totalRows}`;

  return (
    <div className="buses-page">
      <PageHeader
        title="Fleet"
        subtitle="All registered buses and their latest known position"
        actions={
          <>
            <TimeAgo timestamp={lastUpdate} />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchBuses(true)}
              icon={RefreshCw}
              loading={refreshing}
            >
              Refresh
            </Button>
          </>
        }
      />

      <div className="buses-kpi-strip">
        {kpiData.map((kpi) => (
          <StatCard
            key={kpi.key}
            label={kpi.label}
            value={kpi.value}
            subText={kpi.subText}
            icon={kpi.icon}
            accent={kpi.accent}
            onClick={() => handleKpiClick(kpi.key)}
          />
        ))}
      </div>

      {refreshError && (
        <Callout variant="warning">
          {refreshError}
        </Callout>
      )}

      <TableToolbar
        searchSlot={
          <SearchInput
            placeholder="Search buses..."
            value={searchQuery}
            onChange={handleSearch}
          />
        }
        filterSlot={
          <>
            <Select
              value={activeFilter}
              onChange={handleFilter}
              options={[
                { value: 'all', label: 'All statuses' },
                ...distinctStatuses.map(s => ({ value: s, label: s })),
              ]}
            />
            <FilterChips
              options={[
                { value: 'all', label: 'All' },
                { value: 'withGps', label: 'With GPS' },
                { value: 'noGps', label: 'No GPS' },
              ]}
              activeFilter={activeFilter}
              onChange={handleFilter}
              counts={filterCounts}
            />
          </>
        }
        resultCount={resultCount}
        totalRows={pagination.totalRows}
        density={density}
        onDensityChange={handleDensityChange}
        onExport={handleExport}
      />

      <DataTable
        columns={columns}
        rows={paginatedRows}
        getRowId={getRowId}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        onRowClick={handleRowClick}
        selectedRowId={selectedBus?.busId}
        density={density}
        emptyState={
          searchQuery || activeFilter !== 'all' ? (
            <EmptyState
              title="No results found"
              message="Try adjusting your search or filters"
            />
          ) : null
        }
        caption="Buses table"
      />

      <Pagination
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        totalPages={pagination.totalPages}
        totalRows={pagination.totalRows}
        hasNextPage={pagination.hasNextPage}
        hasPrevPage={pagination.hasPrevPage}
        onPageChange={tableState.handlePageChange}
        onPageSizeChange={tableState.handlePageSizeChange}
      />

      <Callout variant="info" icon={null}>
        <strong>Note:</strong> Bus IDs follow the existing BusMitra convention (e.g., bus_101, bus_038).
        These IDs are preserved for compatibility with the existing Driver and Passenger applications.
      </Callout>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <div className="drawer-header">
          <h2 className="drawer-title">Bus {selectedBus?.busNumber || selectedBus?.busId}</h2>
        </div>
        {selectedBus && (
          <div className="buses-drawer-content">
            <div className="buses-drawer-section">
              <h3 className="buses-drawer-section-title">Bus Information</h3>
              <div className="buses-drawer-row">
                <span className="buses-drawer-label">Bus Number</span>
                <span className="buses-drawer-value">{selectedBus.busNumber || '—'}</span>
              </div>
              <div className="buses-drawer-row">
                <span className="buses-drawer-label">Bus ID</span>
                <span className="buses-drawer-value">
                  {selectedBus.busId || '—'}
                  {selectedBus.busId && <CopyButton label="Bus ID" value={selectedBus.busId} />}
                </span>
              </div>
            </div>

            <div className="buses-drawer-section">
              <h3 className="buses-drawer-section-title">Route</h3>
              <div className="buses-drawer-row">
                <span className="buses-drawer-label">Route</span>
                <span className="buses-drawer-value">{selectedBus.route || '—'}</span>
              </div>
              <div className="buses-drawer-row">
                <span className="buses-drawer-label">From</span>
                <span className="buses-drawer-value">{selectedBus.from || '—'}</span>
              </div>
              <div className="buses-drawer-row">
                <span className="buses-drawer-label">To</span>
                <span className="buses-drawer-value">{selectedBus.to || '—'}</span>
              </div>
            </div>

            <div className="buses-drawer-section">
              <h3 className="buses-drawer-section-title">Status</h3>
              <div className="buses-drawer-row">
                <span className="buses-drawer-label">Bus Status</span>
                <span className="buses-drawer-value">
                  <Badge variant={getStatusVariant(selectedBus.status)}>
                    {selectedBus.status || 'Unknown'}
                  </Badge>
                </span>
              </div>
              <div className="buses-drawer-row">
                <span className="buses-drawer-label">GPS</span>
                <span className="buses-drawer-value">
                  <Badge variant={hasValidGps(selectedBus) ? 'success' : 'neutral'}>
                    {hasValidGps(selectedBus) ? 'Available' : 'No GPS'}
                  </Badge>
                </span>
              </div>
            </div>

            <div className="buses-drawer-section">
              <h3 className="buses-drawer-section-title">Location</h3>
              <div className="buses-drawer-row">
                <span className="buses-drawer-label">Coordinates</span>
                <span className="buses-drawer-value">
                  {hasValidGps(selectedBus) ? (
                    <>
                      {selectedBus.lat.toFixed(4)}, {selectedBus.lng.toFixed(4)}
                      <CopyButton label="Coordinates" value={`${selectedBus.lat.toFixed(4)}, ${selectedBus.lng.toFixed(4)}`} />
                    </>
                  ) : (
                    'Location unavailable'
                  )}
                </span>
              </div>
              {hasValidGps(selectedBus) && (
                <div className="buses-drawer-row">
                  <span className="buses-drawer-label">Maps</span>
                  <span className="buses-drawer-value">
                    <a
                      href={`https://www.google.com/maps?q=${selectedBus.lat},${selectedBus.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="buses-drawer-link"
                    >
                      Open in Google Maps
                    </a>
                  </span>
                </div>
              )}
            </div>

            <div className="buses-drawer-section">
              <h3 className="buses-drawer-section-title">Last Update</h3>
              <div className="buses-drawer-row">
                <span className="buses-drawer-label">Relative</span>
                <span className="buses-drawer-value">{formatRelativeAge(selectedBus.lastUpdated)}</span>
              </div>
              <div className="buses-drawer-row">
                <span className="buses-drawer-label">Full Date</span>
                <span className="buses-drawer-value">{formatFullTimestamp(selectedBus.lastUpdated)}</span>
              </div>
            </div>

            <div className="buses-drawer-footer">
              <Button
                variant="secondary"
                onClick={() => {
                  if (selectedBus.busId) {
                    navigator.clipboard.writeText(selectedBus.busId);
                    success('Copied bus ID');
                  }
                }}
              >
                Copy Bus ID
              </Button>
              <Link to="/live-monitoring" className="buses-drawer-link-btn">
                <Button variant="primary">
                  Open Live Monitoring
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Buses;

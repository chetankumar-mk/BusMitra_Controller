import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../api/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import DataTable from '../components/table/DataTable';
import TableToolbar from '../components/table/TableToolbar';
import FilterChips from '../components/table/FilterChips';
import Pagination from '../components/table/Pagination';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import Callout from '../components/ui/Callout';
import { EmptyState } from '../components/ui/EmptyState';
import CopyButton from '../components/ui/CopyButton';
import { Select } from '../components/ui/Select';
import { useTableState } from '../components/table/useTableState';
import { useToast } from '../components/ui/Toast';
import { memoryCache } from '../utils/memoryCache';
import { exportCsv } from '../utils/csv';
import { 
  UserPlus, 
  RefreshCw, 
  User, 
  Link as LinkIcon, 
  Check,
  ExternalLink,
} from 'lucide-react';
import './Drivers.css';

const CACHE_KEY = 'drivers';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const TimeAgo = ({ timestamp }) => {
  const [timeAgo, setTimeAgo] = useState('');
  
  useEffect(() => {
    if (!timestamp) return;
    
    const update = () => {
      const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000);
      if (seconds < 60) setTimeAgo(`${seconds}s`);
      else if (seconds < 3600) setTimeAgo(`${Math.floor(seconds / 60)}m`);
      else setTimeAgo(`${Math.floor(seconds / 3600)}h`);
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timestamp]);
  
  if (!timestamp) return null;
  return <span className="drivers-time-ago">Updated {timeAgo} ago</span>;
};

const Drivers = () => {
  const { success, error: toastError } = useToast();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshError, setRefreshError] = useState(null);
  
  // Modal states
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    driverId: '',
    driverName: '',
    registeredDeviceId: '',
  });
  const [registerError, setRegisterError] = useState(null);
  
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkStep, setLinkStep] = useState(1); // 1 = input, 2 = review
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [linkingFirebase, setLinkingFirebase] = useState(false);
  const [linkFirebaseUid, setLinkFirebaseUid] = useState('');
  const [linkError, setLinkError] = useState(null);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDriverForDrawer, setSelectedDriverForDrawer] = useState(null);

  const fetchDrivers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setRefreshError(null);
      } else {
        setLoading(true);
        setError(null);
      }
      
      const response = await apiClient.get('/api/controller/drivers');
      const driversData = response.drivers || [];
      setDrivers(driversData);
      setLastUpdate(new Date().toISOString());
      
      // Update cache
      memoryCache.set(CACHE_KEY, { drivers: driversData, timestamp: new Date().toISOString() }, CACHE_TTL);
      
      if (isRefresh) {
        success('Drivers refreshed');
      }
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
      const errorMsg = 'Failed to load drivers. Please check if the backend is running.';
      if (isRefresh) {
        setRefreshError(errorMsg);
        toastError(errorMsg);
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [success, toastError]);

  useEffect(() => {
    // Check cache first
    const cached = memoryCache.get(CACHE_KEY);
    if (cached && cached.drivers && cached.timestamp) {
      setDrivers(cached.drivers);
      setLastUpdate(cached.timestamp);
      setLoading(false);
      // Re-fetch in background
      fetchDrivers(true);
    } else {
      fetchDrivers();
    }
  }, [fetchDrivers]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const hasFirebaseLinked = (driver) => !!driver.firebaseUid;
  const isAssigned = (driver) => !!driver.busId;

  // KPI data
  const kpiData = useMemo(() => [
    {
      key: 'total',
      label: 'Total Drivers',
      value: drivers.length,
      subText: 'Registered in the system',
      icon: User,
      accent: 'primary',
    },
    {
      key: 'linked',
      label: 'Firebase Linked',
      value: drivers.filter(hasFirebaseLinked).length,
      subText: 'Connected to Firebase',
      icon: LinkIcon,
      accent: 'success',
    },
    {
      key: 'notLinked',
      label: 'Not Linked',
      value: drivers.filter(d => !hasFirebaseLinked(d)).length,
      subText: 'Requires Firebase UID',
      icon: User,
      accent: 'warning',
    },
    {
      key: 'assigned',
      label: 'Assigned',
      value: drivers.filter(isAssigned).length,
      subText: 'Currently on a bus',
      icon: Check,
      accent: 'info',
    },
  ], [drivers]);

  const handleKpiClick = (key) => {
    if (key === 'linked') setActiveFilter('linked');
    else if (key === 'notLinked') setActiveFilter('notLinked');
    else if (key === 'assigned') setActiveFilter('assigned');
    else if (key === 'total') setActiveFilter('all');
  };

  // Filter counts
  const filterCounts = useMemo(() => ({
    all: drivers.length,
    linked: drivers.filter(hasFirebaseLinked).length,
    notLinked: drivers.filter(d => !hasFirebaseLinked(d)).length,
    assigned: drivers.filter(isAssigned).length,
    unassigned: drivers.filter(d => !isAssigned(d)).length,
  }), [drivers]);

  const filterFn = useCallback((rows, activeFilter) => {
    if (activeFilter === 'all') return rows;
    if (activeFilter === 'linked') return rows.filter(hasFirebaseLinked);
    if (activeFilter === 'notLinked') return rows.filter(d => !hasFirebaseLinked(d));
    if (activeFilter === 'assigned') return rows.filter(isAssigned);
    if (activeFilter === 'unassigned') return rows.filter(d => !isAssigned(d));
    return rows;
  }, []);

  const getStatusVariant = (status) => {
    const normalized = status?.toUpperCase();
    if (normalized === 'ACTIVE') return 'success';
    if (normalized === 'INACTIVE') return 'neutral';
    return 'info'; // REGISTERED
  };

  const formatStatusLabel = (status) => {
    if (!status) return 'Registered';
    const normalized = status.toUpperCase();
    if (normalized === 'REGISTERED') return 'Registered';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const columns = [
    {
      id: 'driver',
      header: 'Driver',
      accessor: (r) => r.driverName || '—',
      sortable: true,
      sortType: 'string',
      cell: (row, value) => (
        <div className="drivers-driver-cell">
          <div className="drivers-avatar">
            {getInitials(value)}
          </div>
          <div className="drivers-driver-info">
            <span className="drivers-driver-name">{value}</span>
            <span className="drivers-driver-id">{row.driverId}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'driverId',
      header: 'Driver ID',
      accessor: (r) => r.driverId || '—',
      sortable: true,
      sortType: 'string',
      mono: true,
      cell: (row, value) => (
        <div className="drivers-cell-with-copy">
          <span>{value}</span>
          <CopyButton label="Driver ID" value={value} />
        </div>
      ),
    },
    {
      id: 'deviceId',
      header: 'Device ID',
      accessor: (r) => r.registeredDeviceId || '—',
      sortable: true,
      sortType: 'string',
      mono: true,
      cell: (row, value) => (
        <div className="drivers-cell-with-copy">
          <span>{value}</span>
          <CopyButton label="Device ID" value={value} />
        </div>
      ),
    },
    {
      id: 'firebase',
      header: 'Firebase',
      accessor: (r) => hasFirebaseLinked(r) ? 'Linked' : 'Not linked',
      sortable: true,
      sortType: 'string',
      sortValue: (r) => hasFirebaseLinked(r) ? 0 : 1,
      cell: (row, value) => (
        <div className="drivers-firebase-cell">
          <Badge variant={hasFirebaseLinked(row) ? 'success' : 'warning'}>
            {value}
          </Badge>
          {hasFirebaseLinked(row) && (
            <span className="drivers-firebase-uid" title={row.firebaseUid}>
              {row.firebaseUid.slice(-6)}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (r) => r.status || 'REGISTERED',
      sortable: true,
      sortType: 'string',
      cell: (row, value) => (
        <Badge variant={getStatusVariant(value)}>
          {formatStatusLabel(value)}
        </Badge>
      ),
    },
    {
      id: 'assignedBus',
      header: 'Assigned Bus',
      accessor: (r) => r.busId || 'Not assigned',
      sortable: true,
      sortType: 'string',
      mono: true,
      cell: (row, value) => (
        <span className={isAssigned(row) ? '' : 'drivers-muted'}>
          {value}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="drivers-actions-cell">
          {!hasFirebaseLinked(row) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openLinkModal(row);
              }}
            >
              Link Firebase
            </Button>
          )}
          {hasFirebaseLinked(row) && (
            <div className="drivers-linked-check">
              <Check size={16} />
              <span>Linked</span>
            </div>
          )}
        </div>
      ),
    },
  ];

  const tableState = useTableState({
    rows: drivers,
    tableKey: 'drivers',
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
    filteredRows,
  } = tableState;

  const setActiveFilter = handleFilter;

  const handleRowClick = (row) => {
    setSelectedDriverForDrawer(row);
    setDrawerOpen(true);
  };

  const getRowId = (row) => row.driverId;

  const handleExport = useCallback(() => {
    const columns = [
      { id: 'driverId', header: 'Driver ID', accessor: (r) => r.driverId },
      { id: 'driverName', header: 'Name', accessor: (r) => r.driverName },
      { id: 'deviceId', header: 'Device ID', accessor: (r) => r.registeredDeviceId },
      { id: 'firebaseUid', header: 'Firebase UID', accessor: (r) => r.firebaseUid || '' },
      { id: 'status', header: 'Status', accessor: (r) => r.status || 'REGISTERED' },
      { id: 'busId', header: 'Assigned Bus', accessor: (r) => r.busId || '' },
    ];
    const count = exportCsv(columns, filteredRows, 'busmitra-drivers');
    success(`Exported ${count} rows`);
  }, [filteredRows, success]);

  // Register Driver modal
  const openRegisterModal = () => {
    setRegisterForm({ driverId: '', driverName: '', registeredDeviceId: '' });
    setRegisterError(null);
    setRegisterModalOpen(true);
  };

  const closeRegisterModal = () => {
    if (!registering) {
      setRegisterModalOpen(false);
      setRegisterForm({ driverId: '', driverName: '', registeredDeviceId: '' });
      setRegisterError(null);
    }
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({ ...prev, [name]: value.trim() }));
    setRegisterError(null);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegistering(true);
    setRegisterError(null);

    // Validation
    if (!registerForm.driverId || /\s/.test(registerForm.driverId)) {
      setRegisterError('Driver ID must not contain whitespace');
      setRegistering(false);
      return;
    }
    if (!registerForm.driverName || !registerForm.registeredDeviceId) {
      setRegisterError('All fields are required');
      setRegistering(false);
      return;
    }

    // Check for duplicate driverId (case-insensitive)
    const duplicate = drivers.find(d => d.driverId.toLowerCase() === registerForm.driverId.toLowerCase());
    if (duplicate) {
      setRegisterError('A driver with this ID already exists');
      setRegistering(false);
      return;
    }

    try {
      const response = await apiClient.post('/api/controller/drivers', registerForm);
      
      if (response.driver && response.driver.driverId) {
        setDrivers([...drivers, response.driver]);
        success(`Driver ${registerForm.driverId} registered`);
      } else {
        // Fallback: refetch list
        await fetchDrivers();
        success('Driver registered');
      }
      
      // Update cache
      memoryCache.set(CACHE_KEY, { drivers: [...drivers, response.driver], timestamp: new Date().toISOString() }, CACHE_TTL);
      
      setRegisterModalOpen(false);
      setRegisterForm({ driverId: '', driverName: '', registeredDeviceId: '' });
    } catch (err) {
      console.error('Failed to register driver:', err);
      setRegisterError(err.message || 'Failed to register driver');
    } finally {
      setRegistering(false);
    }
  };

  // Link Firebase modal
  const openLinkModal = (driver) => {
    setSelectedDriver(driver);
    setLinkFirebaseUid('');
    setLinkError(null);
    setLinkStep(1);
    setLinkModalOpen(true);
  };

  const closeLinkModal = () => {
    if (!linkingFirebase) {
      setLinkModalOpen(false);
      setSelectedDriver(null);
      setLinkFirebaseUid('');
      setLinkError(null);
      setLinkStep(1);
    }
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    setLinkingFirebase(true);
    setLinkError(null);

    try {
      const response = await apiClient.post(`/api/controller/drivers/${selectedDriver.driverId}/link-firebase`, {
        firebaseUid: linkFirebaseUid.trim(),
      });
      
      // Update local state
      setDrivers(drivers.map(d => 
        d.driverId === selectedDriver.driverId 
          ? { ...d, firebaseUid: linkFirebaseUid.trim() }
          : d
      ));
      
      // Update cache
      memoryCache.set(CACHE_KEY, { 
        drivers: drivers.map(d => 
          d.driverId === selectedDriver.driverId 
            ? { ...d, firebaseUid: linkFirebaseUid.trim() }
            : d
        ), 
        timestamp: new Date().toISOString() 
      }, CACHE_TTL);
      
      success(response.message || 'Firebase UID linked successfully');
      setLinkModalOpen(false);
      setSelectedDriver(null);
      setLinkFirebaseUid('');
    } catch (err) {
      console.error('Failed to link Firebase UID:', err);
      setLinkError(err.message || 'Failed to link Firebase UID');
    } finally {
      setLinkingFirebase(false);
    }
  };

  const resultCount = filteredRows.length === 1 
    ? '1 driver' 
    : `${filteredRows.length} drivers`;

  if (loading) {
    return (
      <div className="drivers-page">
        <PageHeader
          title="Drivers"
          subtitle="Registered drivers, devices and Firebase links"
        />
        <div className="drivers-kpi-strip">
          {kpiData.map((kpi) => (
            <StatCard key={kpi.key} loading />
          ))}
        </div>
      </div>
    );
  }

  if (error && !drivers.length) {
    return (
      <div className="drivers-page">
        <PageHeader
          title="Drivers"
          subtitle="Registered drivers, devices and Firebase links"
        />
        <EmptyState
          title="Failed to load drivers"
          message={error}
          actionLabel="Retry"
          onAction={() => fetchDrivers()}
        />
      </div>
    );
  }

  if (!drivers.length) {
    return (
      <div className="drivers-page">
        <PageHeader
          title="Drivers"
          subtitle="Registered drivers, devices and Firebase links"
          actions={
            <Button variant="primary" onClick={openRegisterModal}>
              <UserPlus size={16} />
              Register driver
            </Button>
          }
        />
        <EmptyState
          title="No drivers registered"
          message="Register your first driver to get started"
          actionLabel="Register driver"
          onAction={openRegisterModal}
        />
      </div>
    );
  }

  return (
    <div className="drivers-page">
      <PageHeader
        title="Drivers"
        subtitle="Registered drivers, devices and Firebase links"
        actions={
          <>
            <TimeAgo timestamp={lastUpdate} />
            <Button
              variant="secondary"
              onClick={() => fetchDrivers(true)}
              loading={refreshing}
            >
              <RefreshCw size={16} />
              Refresh
            </Button>
            <Button variant="primary" onClick={openRegisterModal}>
              <UserPlus size={16} />
              Register driver
            </Button>
          </>
        }
      />

      {refreshError && (
        <Callout variant="warning" className="drivers-refresh-error">
          {refreshError}
        </Callout>
      )}

      <div className="drivers-kpi-strip">
        {kpiData.map((kpi) => (
          <StatCard
            key={kpi.key}
            label={kpi.label}
            value={kpi.value}
            subText={kpi.subText}
            icon={kpi.icon}
            accent={kpi.accent}
            onClick={() => handleKpiClick(kpi.key)}
            interactive
          />
        ))}
      </div>

      <TableToolbar
        searchSlot={
          <Input
            placeholder="Search by ID, name, device, Firebase UID, bus..."
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
                { value: 'linked', label: 'Firebase Linked' },
                { value: 'notLinked', label: 'Not Linked' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'unassigned', label: 'Unassigned' },
              ]}
            />
            <FilterChips
              options={[
                { value: 'all', label: 'All' },
                { value: 'linked', label: 'Linked' },
                { value: 'notLinked', label: 'Not Linked' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'unassigned', label: 'Unassigned' },
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
        selectedRowId={selectedDriverForDrawer?.driverId}
        density={density}
        emptyState={
          searchQuery || activeFilter !== 'all' ? (
            <EmptyState
              title="No results found"
              message="Try adjusting your search or filters"
              actionLabel="Clear filters"
              onAction={() => {
                handleSearch('');
                handleFilter('all');
              }}
            />
          ) : null
        }
        caption="Drivers table"
      />

      <Pagination
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        totalRows={pagination.totalRows}
        onPageChange={pagination.handlePageChange}
        onPageSizeChange={pagination.handlePageSizeChange}
      />

      <Callout variant="warning" className="drivers-info-banner">
        <strong>Note:</strong> Link Firebase UID to enable Firebase custom claim synchronization. Controller authentication is required before production use.
      </Callout>

      {/* Register Driver Modal */}
      <Modal
        isOpen={registerModalOpen}
        onClose={closeRegisterModal}
        title="Register Driver"
      >
        <form onSubmit={handleRegisterSubmit}>
          <div className="drivers-form-group">
            <label htmlFor="reg-driverId">Driver ID *</label>
            <Input
              id="reg-driverId"
              name="driverId"
              value={registerForm.driverId}
              onChange={handleRegisterChange}
              placeholder="e.g., DRV001"
              required
              autoFocus
            />
            <span className="drivers-form-hint">No whitespace allowed</span>
          </div>

          <div className="drivers-form-group">
            <label htmlFor="reg-driverName">Driver Name *</label>
            <Input
              id="reg-driverName"
              name="driverName"
              value={registerForm.driverName}
              onChange={handleRegisterChange}
              placeholder="e.g., Rahul"
              required
            />
          </div>

          <div className="drivers-form-group">
            <label htmlFor="reg-deviceId">Registered Device ID *</label>
            <Input
              id="reg-deviceId"
              name="registeredDeviceId"
              value={registerForm.registeredDeviceId}
              onChange={handleRegisterChange}
              placeholder="e.g., DEV001"
              required
            />
          </div>

          {registerError && (
            <Callout variant="danger" role="alert" className="drivers-form-error">
              {registerError}
            </Callout>
          )}

          <div className="drivers-form-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={closeRegisterModal}
              disabled={registering}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={registering}
              disabled={registering}
            >
              {registering ? 'Registering...' : 'Register'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Link Firebase Modal */}
      <Modal
        isOpen={linkModalOpen}
        onClose={closeLinkModal}
        title={linkStep === 1 ? 'Link Firebase UID' : 'Review Link'}
      >
        {linkStep === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); setLinkStep(2); }}>
            <div className="drivers-driver-summary">
              <div className="drivers-avatar">
                {getInitials(selectedDriver?.driverName)}
              </div>
              <div>
                <div className="drivers-driver-name">{selectedDriver?.driverName}</div>
                <div className="drivers-driver-id">{selectedDriver?.driverId}</div>
              </div>
            </div>

            <div className="drivers-form-group">
              <label htmlFor="link-firebaseUid">Firebase UID *</label>
              <Input
                id="link-firebaseUid"
                value={linkFirebaseUid}
                onChange={(e) => setLinkFirebaseUid(e.target.value.trim())}
                placeholder="e.g., abc123xyz789"
                required
                autoFocus
              />
              <span className="drivers-form-hint">
                This enables Firebase custom claim synchronization
              </span>
            </div>

            <div className="drivers-form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={closeLinkModal}
                disabled={linkingFirebase}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!linkFirebaseUid}
              >
                Review
              </Button>
            </div>
          </form>
        )}

        {linkStep === 2 && (
          <form onSubmit={handleLinkSubmit}>
            <div className="drivers-review-section">
              <div className="drivers-review-label">Driver</div>
              <div className="drivers-review-value">
                {selectedDriver?.driverName} ({selectedDriver?.driverId})
              </div>
            </div>

            <div className="drivers-review-section">
              <div className="drivers-review-label">Firebase UID</div>
              <div className="drivers-review-value drivers-mono">
                {linkFirebaseUid}
              </div>
            </div>

            <Callout variant="warning" className="drivers-link-warning">
              Once linked, this driver's Link button is disabled on this screen.
            </Callout>

            {linkError && (
              <Callout variant="danger" role="alert" className="drivers-form-error">
                {linkError}
              </Callout>
            )}

            <div className="drivers-form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setLinkStep(1)}
                disabled={linkingFirebase}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={linkingFirebase}
                disabled={linkingFirebase}
              >
                {linkingFirebase ? 'Linking...' : 'Confirm and link'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Drawer */}
      <Modal
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <div className="drawer-header">
          <h2 className="drawer-title">Driver {selectedDriverForDrawer?.driverName}</h2>
        </div>
        {selectedDriverForDrawer && (
          <div className="drivers-drawer-content">
            <div className="drivers-drawer-section">
              <h3 className="drivers-drawer-section-title">Identity</h3>
              <div className="drivers-drawer-row">
                <span className="drivers-drawer-label">Driver ID</span>
                <span className="drivers-drawer-value">
                  {selectedDriverForDrawer.driverId}
                  <CopyButton label="Driver ID" value={selectedDriverForDrawer.driverId} />
                </span>
              </div>
              <div className="drivers-drawer-row">
                <span className="drivers-drawer-label">Name</span>
                <span className="drivers-drawer-value">{selectedDriverForDrawer.driverName}</span>
              </div>
            </div>

            <div className="drivers-drawer-section">
              <h3 className="drivers-drawer-section-title">Device</h3>
              <div className="drivers-drawer-row">
                <span className="drivers-drawer-label">Device ID</span>
                <span className="drivers-drawer-value">
                  {selectedDriverForDrawer.registeredDeviceId}
                  <CopyButton label="Device ID" value={selectedDriverForDrawer.registeredDeviceId} />
                </span>
              </div>
            </div>

            <div className="drivers-drawer-section">
              <h3 className="drivers-drawer-section-title">Firebase</h3>
              <div className="drivers-drawer-row">
                <span className="drivers-drawer-label">Status</span>
                <span className="drivers-drawer-value">
                  <Badge variant={hasFirebaseLinked(selectedDriverForDrawer) ? 'success' : 'warning'}>
                    {hasFirebaseLinked(selectedDriverForDrawer) ? 'Linked' : 'Not linked'}
                  </Badge>
                </span>
              </div>
              {hasFirebaseLinked(selectedDriverForDrawer) && (
                <div className="drivers-drawer-row">
                  <span className="drivers-drawer-label">Firebase UID</span>
                  <span className="drivers-drawer-value drivers-mono">
                    {selectedDriverForDrawer.firebaseUid}
                    <CopyButton label="Firebase UID" value={selectedDriverForDrawer.firebaseUid} />
                  </span>
                </div>
              )}
            </div>

            <div className="drivers-drawer-section">
              <h3 className="drivers-drawer-section-title">Assignment</h3>
              <div className="drivers-drawer-row">
                <span className="drivers-drawer-label">Bus ID</span>
                <span className="drivers-drawer-value">
                  {selectedDriverForDrawer.busId || 'Not assigned'}
                </span>
              </div>
            </div>

            <div className="drivers-drawer-section">
              <h3 className="drivers-drawer-section-title">Status</h3>
              <div className="drivers-drawer-row">
                <span className="drivers-drawer-label">Driver Status</span>
                <span className="drivers-drawer-value">
                  <Badge variant={getStatusVariant(selectedDriverForDrawer.status)}>
                    {formatStatusLabel(selectedDriverForDrawer.status)}
                  </Badge>
                </span>
              </div>
            </div>

            <div className="drivers-drawer-footer">
              {!hasFirebaseLinked(selectedDriverForDrawer) && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setDrawerOpen(false);
                    openLinkModal(selectedDriverForDrawer);
                  }}
                >
                  Link Firebase
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Drivers;

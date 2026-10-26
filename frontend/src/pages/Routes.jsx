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
  Plus, 
  RefreshCw, 
  Edit3, 
  Power,
  Check,
  X,
  ChevronRight,
} from 'lucide-react';
import './Routes.css';

const CACHE_KEY = 'routes';
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
  return <span className="routes-time-ago">Updated {timeAgo} ago</span>;
};

const Routes = () => {
  const { success, error: toastError } = useToast();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshError, setRefreshError] = useState(null);
  
  // Modal states
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [routeModalMode, setRouteModalMode] = useState('create'); // 'create' | 'edit'
  const [savingRoute, setSavingRoute] = useState(false);
  const [routeForm, setRouteForm] = useState({
    routeName: '',
    from: '',
    via: '',
    to: '',
  });
  const [routeError, setRouteError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivatingRoute, setDeactivatingRoute] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRouteForDrawer, setSelectedRouteForDrawer] = useState(null);

  const fetchRoutes = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setRefreshError(null);
      } else {
        setLoading(true);
        setError(null);
      }
      
      const response = await apiClient.get('/api/controller/routes');
      const routesData = response.routes || [];
      setRoutes(routesData);
      setLastUpdate(new Date().toISOString());
      
      // Update cache
      memoryCache.set(CACHE_KEY, { routes: routesData, timestamp: new Date().toISOString() }, CACHE_TTL);
      
      if (isRefresh) {
        success('Routes refreshed');
      }
    } catch (err) {
      console.error('Failed to fetch routes:', err);
      const errorMsg = 'Failed to load routes. Please check if the backend is running.';
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
    if (cached && cached.routes && cached.timestamp) {
      setRoutes(cached.routes);
      setLastUpdate(cached.timestamp);
      setLoading(false);
      // Re-fetch in background
      fetchRoutes(true);
    } else {
      fetchRoutes();
    }
  }, [fetchRoutes]);

  const isActive = (route) => route.status?.toLowerCase() === 'active';

  // KPI data
  const kpiData = useMemo(() => [
    {
      key: 'total',
      label: 'Total Routes',
      value: routes.length,
      subText: 'Registered in the system',
      icon: ChevronRight,
      accent: 'primary',
    },
    {
      key: 'active',
      label: 'Active',
      value: routes.filter(isActive).length,
      subText: 'Currently in use',
      icon: Check,
      accent: 'success',
    },
    {
      key: 'inactive',
      label: 'Inactive',
      value: routes.filter(r => !isActive(r)).length,
      subText: 'Not in use',
      icon: X,
      accent: 'neutral',
    },
  ], [routes]);

  const handleKpiClick = (key) => {
    if (key === 'active') setActiveFilter('active');
    else if (key === 'inactive') setActiveFilter('inactive');
    else if (key === 'total') setActiveFilter('all');
  };

  // Filter counts
  const filterCounts = useMemo(() => ({
    all: routes.length,
    active: routes.filter(isActive).length,
    inactive: routes.filter(r => !isActive(r)).length,
  }), [routes]);

  const filterFn = useCallback((rows, activeFilter) => {
    if (activeFilter === 'all') return rows;
    if (activeFilter === 'active') return rows.filter(isActive);
    if (activeFilter === 'inactive') return rows.filter(r => !isActive(r));
    return rows;
  }, []);

  const formatStatusLabel = (status) => {
    if (!status) return 'Inactive';
    const normalized = status.toLowerCase();
    if (normalized === 'active') return 'Active';
    return 'Inactive';
  };

  const columns = [
    {
      id: 'routeId',
      header: 'Route ID',
      accessor: (r) => r.routeId || '—',
      sortable: true,
      sortType: 'string',
      mono: true,
      cell: (row, value) => (
        <div className="routes-cell-with-copy">
          <span>{value}</span>
          <CopyButton label="Route ID" value={value} />
        </div>
      ),
    },
    {
      id: 'routeName',
      header: 'Route Name',
      accessor: (r) => r.routeName || '—',
      sortable: true,
      sortType: 'string',
      cell: (row, value) => (
        <span className="routes-route-name">{value}</span>
      ),
    },
    {
      id: 'from',
      header: 'From',
      accessor: (r) => r.from || '—',
      sortable: true,
      sortType: 'string',
    },
    {
      id: 'via',
      header: 'Via',
      accessor: (r) => r.via || '—',
      sortable: true,
      sortType: 'string',
      hideBelow: 1280,
      cell: (row, value) => (
        <span className={value === '—' ? 'routes-muted' : ''}>{value}</span>
      ),
    },
    {
      id: 'to',
      header: 'To',
      accessor: (r) => r.to || '—',
      sortable: true,
      sortType: 'string',
    },
    {
      id: 'path',
      header: 'Path',
      accessor: (r) => {
        const parts = [r.from, r.via, r.to].filter(Boolean);
        return parts.join(' → ');
      },
      sortable: false,
      hideBelow: 1024,
      cell: (row, value) => (
        <span className="routes-path" title={value}>
          {value}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (r) => r.status || 'inactive',
      sortable: true,
      sortType: 'string',
      cell: (row, value) => (
        <Badge variant={isActive(row) ? 'success' : 'neutral'}>
          {formatStatusLabel(value)}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="routes-actions-cell">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(row);
            }}
            title="Edit route"
          >
            <Edit3 size={16} />
          </Button>
          {isActive(row) ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openDeactivateModal(row);
              }}
              title="Deactivate route"
              loading={togglingStatus && deactivatingRoute?.routeId === row.routeId}
              disabled={togglingStatus}
            >
              <Power size={16} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleStatus(row);
              }}
              title="Activate route"
              loading={togglingStatus && deactivatingRoute?.routeId === row.routeId}
              disabled={togglingStatus}
            >
              <Power size={16} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const tableState = useTableState({
    rows: routes,
    tableKey: 'routes',
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
    setSelectedRouteForDrawer(row);
    setDrawerOpen(true);
  };

  const getRowId = (row) => row.routeId;

  const handleExport = useCallback(() => {
    const columns = [
      { id: 'routeId', header: 'Route ID', accessor: (r) => r.routeId },
      { id: 'routeName', header: 'Name', accessor: (r) => r.routeName },
      { id: 'from', header: 'From', accessor: (r) => r.from },
      { id: 'via', header: 'Via', accessor: (r) => r.via },
      { id: 'to', header: 'To', accessor: (r) => r.to },
      { id: 'status', header: 'Status', accessor: (r) => r.status || 'inactive' },
    ];
    const count = exportCsv(columns, filteredRows, 'busmitra-routes');
    success(`Exported ${count} rows`);
  }, [filteredRows, success]);

  // Create/Edit Route modal
  const openCreateModal = () => {
    setRouteForm({ routeName: '', from: '', via: '', to: '' });
    setRouteError(null);
    setSelectedRoute(null);
    setRouteModalMode('create');
    setRouteModalOpen(true);
  };

  const openEditModal = (route) => {
    setSelectedRoute(route);
    setRouteForm({
      routeName: route.routeName || '',
      from: route.from || '',
      via: route.via || '',
      to: route.to || '',
    });
    setRouteError(null);
    setRouteModalMode('edit');
    setRouteModalOpen(true);
  };

  const closeRouteModal = () => {
    if (!savingRoute) {
      setRouteModalOpen(false);
      setRouteForm({ routeName: '', from: '', via: '', to: '' });
      setRouteError(null);
      setSelectedRoute(null);
    }
  };

  const handleRouteChange = (e) => {
    const { name, value } = e.target;
    setRouteForm(prev => ({ ...prev, [name]: value.trim() }));
    setRouteError(null);
  };

  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    setSavingRoute(true);
    setRouteError(null);

    // Validation
    if (!routeForm.routeName || !routeForm.from || !routeForm.to) {
      setRouteError('All required fields must be filled');
      setSavingRoute(false);
      return;
    }

    // Check for duplicate route name (case-insensitive) - non-blocking hint
    const duplicate = routes.find(r => 
      r.routeId !== selectedRoute?.routeId && 
      r.routeName?.toLowerCase() === routeForm.routeName.toLowerCase()
    );
    if (duplicate) {
      setRouteError('A route with this name already exists');
      setSavingRoute(false);
      return;
    }

    try {
      if (routeModalMode === 'create') {
        await apiClient.post('/api/controller/routes', routeForm);
        success('Route created');
      } else {
        await apiClient.put(`/api/controller/routes/${selectedRoute.routeId}`, routeForm);
        success('Route updated');
      }
      
      // Background refetch
      await fetchRoutes(true);
      
      setRouteModalOpen(false);
      setRouteForm({ routeName: '', from: '', via: '', to: '' });
      setSelectedRoute(null);
    } catch (err) {
      console.error('Failed to save route:', err);
      setRouteError(err.message || (routeModalMode === 'create' ? 'Failed to create route' : 'Failed to update route'));
    } finally {
      setSavingRoute(false);
    }
  };

  // Deactivate modal
  const openDeactivateModal = (route) => {
    setDeactivatingRoute(route);
    setDeactivateModalOpen(true);
  };

  const closeDeactivateModal = () => {
    setDeactivateModalOpen(false);
    setDeactivatingRoute(null);
  };

  const handleToggleStatus = async (route) => {
    const newStatus = isActive(route) ? 'inactive' : 'active';
    setTogglingStatus(true);
    setDeactivatingRoute(route);

    try {
      await apiClient.put(`/api/controller/routes/${route.routeId}`, { status: newStatus });
      success(`Route ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      await fetchRoutes(true);
    } catch (err) {
      console.error('Failed to toggle route status:', err);
      toastError(err.message || 'Failed to update route status');
    } finally {
      setTogglingStatus(false);
      setDeactivatingRoute(null);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingRoute) return;
    
    setTogglingStatus(true);
    
    try {
      await apiClient.put(`/api/controller/routes/${deactivatingRoute.routeId}`, { status: 'inactive' });
      success('Route deactivated');
      setDeactivateModalOpen(false);
      setDeactivatingRoute(null);
      await fetchRoutes(true);
    } catch (err) {
      console.error('Failed to deactivate route:', err);
      toastError(err.message || 'Failed to deactivate route');
    } finally {
      setTogglingStatus(false);
    }
  };

  const resultCount = filteredRows.length === 1 
    ? '1 route' 
    : `${filteredRows.length} routes`;

  if (loading) {
    return (
      <div className="routes-page">
        <PageHeader
          title="Routes"
          subtitle="Manage the routes buses can be assigned to"
        />
        <div className="routes-kpi-strip">
          {kpiData.map((kpi) => (
            <StatCard key={kpi.key} loading />
          ))}
        </div>
      </div>
    );
  }

  if (error && !routes.length) {
    return (
      <div className="routes-page">
        <PageHeader
          title="Routes"
          subtitle="Manage the routes buses can be assigned to"
        />
        <EmptyState
          title="Failed to load routes"
          message={error}
          actionLabel="Retry"
          onAction={() => fetchRoutes()}
        />
      </div>
    );
  }

  if (!routes.length) {
    return (
      <div className="routes-page">
        <PageHeader
          title="Routes"
          subtitle="Manage the routes buses can be assigned to"
          actions={
            <Button variant="primary" onClick={openCreateModal}>
              <Plus size={16} />
              Create route
            </Button>
          }
        />
        <EmptyState
          title="No routes registered"
          message="Create your first route to get started"
          actionLabel="Create route"
          onAction={openCreateModal}
        />
      </div>
    );
  }

  return (
    <div className="routes-page">
      <PageHeader
        title="Routes"
        subtitle="Manage the routes buses can be assigned to"
        actions={
          <>
            <TimeAgo timestamp={lastUpdate} />
            <Button
              variant="secondary"
              onClick={() => fetchRoutes(true)}
              loading={refreshing}
            >
              <RefreshCw size={16} />
              Refresh
            </Button>
            <Button variant="primary" onClick={openCreateModal}>
              <Plus size={16} />
              Create route
            </Button>
          </>
        }
      />

      {refreshError && (
        <Callout variant="warning" className="routes-refresh-error">
          {refreshError}
        </Callout>
      )}

      <div className="routes-kpi-strip">
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
            placeholder="Search by ID, name, from, via, to..."
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
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <FilterChips
              options={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
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
        selectedRowId={selectedRouteForDrawer?.routeId}
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
        caption="Routes table"
      />

      <Pagination
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        totalRows={pagination.totalRows}
        onPageChange={pagination.handlePageChange}
        onPageSizeChange={pagination.handlePageSizeChange}
      />

      {/* Create/Edit Route Modal */}
      <Modal
        isOpen={routeModalOpen}
        onClose={closeRouteModal}
        title={routeModalMode === 'create' ? 'Create Route' : 'Edit Route'}
      >
        <form onSubmit={handleRouteSubmit}>
          <div className="routes-form-group">
            <label htmlFor="route-routeName">Route Name *</label>
            <Input
              id="route-routeName"
              name="routeName"
              value={routeForm.routeName}
              onChange={handleRouteChange}
              placeholder="e.g., Central to Airport"
              required
              autoFocus
            />
          </div>

          <div className="routes-form-group">
            <label htmlFor="route-from">From *</label>
            <Input
              id="route-from"
              name="from"
              value={routeForm.from}
              onChange={handleRouteChange}
              placeholder="e.g., Central Station"
              required
            />
          </div>

          <div className="routes-form-group">
            <label htmlFor="route-via">Via</label>
            <Input
              id="route-via"
              name="via"
              value={routeForm.via}
              onChange={handleRouteChange}
              placeholder="e.g., Main Street (optional)"
            />
          </div>

          <div className="routes-form-group">
            <label htmlFor="route-to">To *</label>
            <Input
              id="route-to"
              name="to"
              value={routeForm.to}
              onChange={handleRouteChange}
              placeholder="e.g., Airport Terminal"
              required
            />
          </div>

          {routeError && (
            <Callout variant="danger" role="alert" className="routes-form-error">
              {routeError}
            </Callout>
          )}

          <div className="routes-form-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={closeRouteModal}
              disabled={savingRoute}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingRoute}
              disabled={savingRoute}
            >
              {savingRoute ? 'Saving...' : (routeModalMode === 'create' ? 'Create' : 'Update')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={deactivateModalOpen}
        onClose={closeDeactivateModal}
        title={`Deactivate ${deactivatingRoute?.routeName}?`}
      >
        <p className="routes-deactivate-text">
          This sets the route status to inactive. It does not delete the route.
        </p>

        <div className="routes-form-actions">
          <Button
            variant="secondary"
            onClick={closeDeactivateModal}
            disabled={togglingStatus}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDeactivate}
            loading={togglingStatus}
            disabled={togglingStatus}
          >
            {togglingStatus ? 'Deactivating...' : 'Deactivate'}
          </Button>
        </div>
      </Modal>

      {/* Drawer */}
      <Modal
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <div className="drawer-header">
          <h2 className="drawer-title">{selectedRouteForDrawer?.routeName}</h2>
          <Badge variant={isActive(selectedRouteForDrawer) ? 'success' : 'neutral'}>
            {formatStatusLabel(selectedRouteForDrawer?.status)}
          </Badge>
        </div>
        {selectedRouteForDrawer && (
          <div className="routes-drawer-content">
            <div className="routes-path-visual">
              <div className="routes-path-node">
                <div className="routes-path-dot"></div>
                <span className="routes-path-label">From</span>
                <span className="routes-path-value">{selectedRouteForDrawer.from || '—'}</span>
              </div>
              <div className="routes-path-line"></div>
              {selectedRouteForDrawer.via && (
                <>
                  <div className="routes-path-node">
                    <div className="routes-path-dot"></div>
                    <span className="routes-path-label">Via</span>
                    <span className="routes-path-value">{selectedRouteForDrawer.via}</span>
                  </div>
                  <div className="routes-path-line"></div>
                </>
              )}
              <div className="routes-path-node">
                <div className="routes-path-dot"></div>
                <span className="routes-path-label">To</span>
                <span className="routes-path-value">{selectedRouteForDrawer.to || '—'}</span>
              </div>
            </div>

            <div className="routes-drawer-section">
              <h3 className="routes-drawer-section-title">Route Details</h3>
              <div className="routes-drawer-row">
                <span className="routes-drawer-label">Route ID</span>
                <span className="routes-drawer-value routes-mono">
                  {selectedRouteForDrawer.routeId}
                  <CopyButton label="Route ID" value={selectedRouteForDrawer.routeId} />
                </span>
              </div>
              <div className="routes-drawer-row">
                <span className="routes-drawer-label">Status</span>
                <span className="routes-drawer-value">
                  <Badge variant={isActive(selectedRouteForDrawer) ? 'success' : 'neutral'}>
                    {formatStatusLabel(selectedRouteForDrawer.status)}
                  </Badge>
                </span>
              </div>
            </div>

            <div className="routes-drawer-footer">
              <Button
                variant="secondary"
                onClick={() => {
                  setDrawerOpen(false);
                  openEditModal(selectedRouteForDrawer);
                }}
              >
                <Edit3 size={16} />
                Edit
              </Button>
              {isActive(selectedRouteForDrawer) ? (
                <Button
                  variant="danger"
                  onClick={() => {
                    setDrawerOpen(false);
                    openDeactivateModal(selectedRouteForDrawer);
                  }}
                >
                  <Power size={16} />
                  Deactivate
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => {
                    setDrawerOpen(false);
                    handleToggleStatus(selectedRouteForDrawer);
                  }}
                >
                  <Power size={16} />
                  Activate
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Routes;

import React, { useState, useMemo, useCallback } from 'react';
import { SearchInput } from '../ui/SearchInput';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Inbox } from 'lucide-react';
import './FleetTable.css';

const FleetTable = ({ fleet, onBusClick, filter, onFilterChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Compute filter counts
  const filterCounts = useMemo(() => {
    if (!fleet || fleet.length === 0) {
      return { all: 0, online: 0, offline: 0, stale: 0, assigned: 0, unassigned: 0 };
    }
    return {
      all: fleet.length,
      online: fleet.filter(b => b.tracking?.isOnline).length,
      offline: fleet.filter(b => !b.tracking?.isOnline).length,
      stale: fleet.filter(b => b.freshness?.state === 'STALE').length,
      assigned: fleet.filter(b => !!b.assignment).length,
      unassigned: fleet.filter(b => !b.assignment).length,
    };
  }, [fleet]);

  const filteredAndSortedBuses = useMemo(() => {
    let result = [...fleet];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(bus => {
        const busNumber = (bus.busNumber || '').toLowerCase();
        const busId = (bus.busId || '').toLowerCase();
        const driverName = (bus.driver?.driverName || '').toLowerCase();
        const driverId = (bus.driver?.driverId || '').toLowerCase();
        const routeText = (bus.assignment?.routeName || bus.assignment?.routeId || bus.tracking?.route || '').toLowerCase();
        
        return busNumber.includes(query) ||
               busId.includes(query) ||
               driverName.includes(query) ||
               driverId.includes(query) ||
               routeText.includes(query);
      });
    }

    // Apply status filter
    if (filter && filter !== 'all') {
      result = result.filter(bus => {
        switch (filter) {
          case 'online':
            return bus.tracking?.isOnline && bus.freshness?.state !== 'STALE';
          case 'offline':
            return !bus.tracking?.isOnline;
          case 'stale':
            return bus.freshness?.state === 'STALE';
          case 'assigned':
            return !!bus.assignment;
          case 'unassigned':
            return !bus.assignment;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue, bValue;

        switch (sortConfig.key) {
          case 'bus':
            aValue = a.busNumber || a.busId || '';
            bValue = b.busNumber || b.busId || '';
            break;
          case 'driver':
            aValue = a.driver?.driverName || '';
            bValue = b.driver?.driverName || '';
            break;
          case 'route':
            aValue = a.assignment?.routeName || a.tracking?.route || '';
            bValue = b.assignment?.routeName || b.tracking?.route || '';
            break;
          case 'lastUpdate':
            aValue = a.tracking?.lastUpdated || 0;
            bValue = b.tracking?.lastUpdated || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [fleet, searchQuery, filter, sortConfig]);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
  }, []);

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

  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return '—';
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    // For dates older than 24 hours, show relative with full date in title
    const days = Math.floor(diff / 86400000);
    const fullDate = new Date(timestamp).toLocaleString();
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getLocationDisplay = (lat, lng) => {
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
      return '—';
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const getRouteDisplay = (route, from, via, to) => {
    if (route) return route;
    if (from && to) {
      return via ? `${from} → ${via} → ${to}` : `${from} → ${to}`;
    }
    return '—';
  };

  const SortIcon = ({ direction }) => (
    <span className={`sort-icon sort-${direction}`}>
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  );

  return (
    <div className="fleet-table">
      <div className="table-toolbar">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search buses..."
          className="table-search"
        />
        <div className="table-filters">
          <button
            className={`filter-chip ${filter === 'all' ? 'filter-chip-active' : ''}`}
            onClick={() => onFilterChange?.('all')}
            type="button"
          >
            All <span className="filter-count">{filterCounts.all}</span>
          </button>
          <button
            className={`filter-chip ${filter === 'online' ? 'filter-chip-active' : ''}`}
            onClick={() => onFilterChange?.('online')}
            type="button"
          >
            Online <span className="filter-count">{filterCounts.online}</span>
          </button>
          <button
            className={`filter-chip ${filter === 'offline' ? 'filter-chip-active' : ''}`}
            onClick={() => onFilterChange?.('offline')}
            type="button"
          >
            Offline <span className="filter-count">{filterCounts.offline}</span>
          </button>
          <button
            className={`filter-chip ${filter === 'stale' ? 'filter-chip-active' : ''}`}
            onClick={() => onFilterChange?.('stale')}
            type="button"
          >
            Stale <span className="filter-count">{filterCounts.stale}</span>
          </button>
          <button
            className={`filter-chip ${filter === 'assigned' ? 'filter-chip-active' : ''}`}
            onClick={() => onFilterChange?.('assigned')}
            type="button"
          >
            Assigned <span className="filter-count">{filterCounts.assigned}</span>
          </button>
          <button
            className={`filter-chip ${filter === 'unassigned' ? 'filter-chip-active' : ''}`}
            onClick={() => onFilterChange?.('unassigned')}
            type="button"
          >
            Unassigned <span className="filter-count">{filterCounts.unassigned}</span>
          </button>
        </div>
        <div className="table-stats">
          <span className="result-count">{filteredAndSortedBuses.length} of {fleet.length} buses</span>
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <button
                  className="sort-button"
                  onClick={() => handleSort('bus')}
                  aria-sort={sortConfig.key === 'bus' ? sortConfig.direction : 'none'}
                >
                  Bus
                  {sortConfig.key === 'bus' && <SortIcon direction={sortConfig.direction} />}
                </button>
              </th>
              <th>
                <button
                  className="sort-button"
                  onClick={() => handleSort('driver')}
                  aria-sort={sortConfig.key === 'driver' ? sortConfig.direction : 'none'}
                >
                  Driver
                  {sortConfig.key === 'driver' && <SortIcon direction={sortConfig.direction} />}
                </button>
              </th>
              <th>
                <button
                  className="sort-button"
                  onClick={() => handleSort('route')}
                  aria-sort={sortConfig.key === 'route' ? sortConfig.direction : 'none'}
                >
                  Route
                  {sortConfig.key === 'route' && <SortIcon direction={sortConfig.direction} />}
                </button>
              </th>
              <th>Bus Status</th>
              <th>Tracking</th>
              <th>Location</th>
              <th>
                <button
                  className="sort-button"
                  onClick={() => handleSort('lastUpdate')}
                  aria-sort={sortConfig.key === 'lastUpdate' ? sortConfig.direction : 'none'}
                >
                  Last Update
                  {sortConfig.key === 'lastUpdate' && <SortIcon direction={sortConfig.direction} />}
                </button>
              </th>
              <th>Assignment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {fleet.length === 0 ? (
              <tr>
                <td colSpan="9">
                  <EmptyState
                    icon={Inbox}
                    title="No fleet data"
                    description="Fleet information will appear when buses are registered"
                  />
                </td>
              </tr>
            ) : filteredAndSortedBuses.length === 0 ? (
              <tr>
                <td colSpan="9">
                  <EmptyState
                    icon={Inbox}
                    title="No results found"
                    description="Try adjusting your search or filters"
                    action={<Button variant="secondary" onClick={handleClearFilters}>Clear filters</Button>}
                  />
                </td>
              </tr>
            ) : (
              filteredAndSortedBuses.map((bus) => (
                <tr
                  key={bus.busId}
                  className="table-row"
                  onClick={() => onBusClick?.(bus)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onBusClick?.(bus);
                    }
                  }}
                >
                  <td className="cell-bus">{bus.busNumber || bus.busId || '—'}</td>
                  <td className="cell-driver">
                    {bus.driver 
                      ? `${bus.driver.driverId} · ${bus.driver.driverName}`
                      : '—'
                    }
                  </td>
                  <td className="cell-route">
                    {getRouteDisplay(
                      bus.tracking?.route,
                      bus.assignment?.from,
                      bus.assignment?.via,
                      bus.assignment?.to
                    )}
                  </td>
                  <td>
                    <Badge variant={getBadgeVariant((bus.operationalState?.busState || 'unknown').toUpperCase())}>
                      {bus.operationalState?.busState?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={getBadgeVariant(bus.tracking?.isOnline ? 'ONLINE' : 'OFFLINE')}>
                      {bus.tracking?.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </Badge>
                  </td>
                  <td className="cell-location">
                    <span className="cell-mono">{getLocationDisplay(bus.tracking?.latitude, bus.tracking?.longitude)}</span>
                  </td>
                  <td className="cell-time" title={bus.tracking?.lastUpdated ? new Date(bus.tracking.lastUpdated).toLocaleString() : ''}>
                    <span className="cell-mono">{formatLastUpdate(bus.tracking?.lastUpdated)}</span>
                  </td>
                  <td>
                    <Badge variant={getBadgeVariant(bus.assignment ? 'ASSIGNED' : 'UNASSIGNED')}>
                      {bus.assignment ? 'ASSIGNED' : 'UNASSIGNED'}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={getBadgeVariant((bus.tracking?.status || 'unknown').toUpperCase())}>
                      {(bus.tracking?.status || 'unknown').toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(FleetTable);

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { SearchInput } from '../ui/SearchInput';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Inbox, Keyboard, MapPinOff } from 'lucide-react';
import { renderIcon } from '../ui/renderIcon';
import { 
  isStale, 
  isOnline, 
  hasValidGps, 
  getFreshnessAge, 
  getFreshnessColor, 
  getBusDisplayName,
  getDriverDisplayName,
  getRouteDisplay,
  isActivelyTracking,
  formatRelativeAge,
  formatFullTimestamp
} from '../../utils/fleet';
import './FleetPanel.css';

const KeyboardShortcuts = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="keyboard-shortcuts-overlay" onClick={onClose}>
      <div className="keyboard-shortcuts-popover" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h3>Keyboard Shortcuts</h3>
          <button onClick={onClose} className="shortcuts-close" type="button">×</button>
        </div>
        <div className="shortcuts-list">
          <div className="shortcut-item">
            <kbd>/</kbd>
            <span>Focus search</span>
          </div>
          <div className="shortcut-item">
            <kbd>↑</kbd> / <kbd>↓</kbd>
            <span>Navigate list</span>
          </div>
          <div className="shortcut-item">
            <kbd>Enter</kbd>
            <span>Select bus</span>
          </div>
          <div className="shortcut-item">
            <kbd>Esc</kbd>
            <span>Clear selection</span>
          </div>
          <div className="shortcut-item">
            <kbd>F</kbd>
            <span>Fit all buses</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const FleetPanel = ({ 
  fleet, 
  selectedBusId, 
  onBusSelect, 
  onFitAll,
  onFilterChange,
  activeFilter 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('busNumber');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Compute filter counts
  const filterCounts = useMemo(() => {
    if (!fleet || fleet.length === 0) {
      return { all: 0, online: 0, offline: 0, stale: 0, active: 0, unassigned: 0 };
    }
    return {
      all: fleet.length,
      online: fleet.filter(b => isOnline(b)).length,
      offline: fleet.filter(b => !isOnline(b)).length,
      stale: fleet.filter(b => isStale(b)).length,
      active: fleet.filter(b => isActivelyTracking(b)).length,
      unassigned: fleet.filter(b => !b.assignment).length,
    };
  }, [fleet]);

  // Filter and sort buses
  const filteredBuses = useMemo(() => {
    let result = [...fleet];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(bus => {
        const busNumber = (bus.busNumber || '').toLowerCase();
        const busId = (bus.busId || '').toLowerCase();
        const driverName = (bus.driver?.driverName || '').toLowerCase();
        const driverId = (bus.driver?.driverId || '').toLowerCase();
        const routeText = (getRouteDisplay(bus) || '').toLowerCase();
        
        return busNumber.includes(query) ||
               busId.includes(query) ||
               driverName.includes(query) ||
               driverId.includes(query) ||
               routeText.includes(query);
      });
    }

    // Apply status filter
    if (activeFilter && activeFilter !== 'all') {
      result = result.filter(bus => {
        switch (activeFilter) {
          case 'online':
            return isOnline(bus);
          case 'offline':
            return !isOnline(bus);
          case 'stale':
            return isStale(bus);
          case 'active':
            return isActivelyTracking(bus);
          case 'unassigned':
            return !bus.assignment;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'busNumber':
          return (a.busNumber || a.busId || '').localeCompare(b.busNumber || b.busId || '');
        case 'lastUpdate':
          return (b.tracking?.lastUpdated || 0) - (a.tracking?.lastUpdated || 0);
        case 'status':
          const aOnline = isOnline(a) ? 0 : 1;
          const bOnline = isOnline(b) ? 0 : 1;
          if (aOnline !== bOnline) return aOnline - bOnline;
          return (a.busNumber || a.busId || '').localeCompare(b.busNumber || b.busId || '');
        default:
          return 0;
      }
    });

    return result;
  }, [fleet, searchQuery, activeFilter, sortBy]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      if (e.key === '/' && !showShortcuts) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        onFitAll?.();
      } else if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else if (selectedBusId) {
          onBusSelect?.(null);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = filteredBuses.findIndex(b => b.busId === selectedBusId);
        let newIndex;
        if (e.key === 'ArrowUp') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : filteredBuses.length - 1;
        } else {
          newIndex = currentIndex < filteredBuses.length - 1 ? currentIndex + 1 : 0;
        }
        if (filteredBuses[newIndex]) {
          onBusSelect?.(filteredBuses[newIndex].busId);
        }
      } else if (e.key === 'Enter' && selectedBusId) {
        const bus = filteredBuses.find(b => b.busId === selectedBusId);
        if (bus && hasValidGps(bus)) {
          // Map will handle the flyTo
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredBuses, selectedBusId, showShortcuts, onBusSelect, onFitAll]);

  const handleFilterClick = useCallback((filter) => {
    onFilterChange?.(filter);
  }, [onFilterChange]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    onFilterChange?.('all');
  }, [onFilterChange]);

  return (
    <div className="fleet-panel">
      <div className="panel-header">
        <SearchInput
          ref={searchInputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search buses..."
          className="panel-search"
        />
        <button
          className="shortcuts-trigger"
          onClick={() => setShowShortcuts(!showShortcuts)}
          type="button"
          aria-label="Keyboard shortcuts"
        >
          {renderIcon(Keyboard, { size: 16 })}
        </button>
      </div>

      <div className="panel-filters">
        <button
          className={`filter-chip ${activeFilter === 'all' ? 'filter-chip-active' : ''}`}
          onClick={() => handleFilterClick('all')}
          type="button"
        >
          All <span className="filter-count">{filterCounts.all}</span>
        </button>
        <button
          className={`filter-chip ${activeFilter === 'online' ? 'filter-chip-active' : ''}`}
          onClick={() => handleFilterClick('online')}
          type="button"
        >
          Online <span className="filter-count">{filterCounts.online}</span>
        </button>
        <button
          className={`filter-chip ${activeFilter === 'offline' ? 'filter-chip-active' : ''}`}
          onClick={() => handleFilterClick('offline')}
          type="button"
        >
          Offline <span className="filter-count">{filterCounts.offline}</span>
        </button>
        <button
          className={`filter-chip ${activeFilter === 'stale' ? 'filter-chip-active' : ''}`}
          onClick={() => handleFilterClick('stale')}
          type="button"
        >
          Stale <span className="filter-count">{filterCounts.stale}</span>
        </button>
        <button
          className={`filter-chip ${activeFilter === 'active' ? 'filter-chip-active' : ''}`}
          onClick={() => handleFilterClick('active')}
          type="button"
        >
          Active <span className="filter-count">{filterCounts.active}</span>
        </button>
        <button
          className={`filter-chip ${activeFilter === 'unassigned' ? 'filter-chip-active' : ''}`}
          onClick={() => handleFilterClick('unassigned')}
          type="button"
        >
          Unassigned <span className="filter-count">{filterCounts.unassigned}</span>
        </button>
      </div>

      <div className="panel-sort">
        <label className="sort-label" htmlFor="sort-select">Sort by</label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="busNumber">Bus number</option>
          <option value="lastUpdate">Last update</option>
          <option value="status">Status</option>
        </select>
      </div>

      <div className="panel-list" ref={listRef}>
        {filteredBuses.length === 0 ? (
          <div className="panel-empty">
            {searchQuery || activeFilter !== 'all' ? (
              <EmptyState
                icon={Inbox}
                title="No matches found"
                description="Try adjusting your search or filters"
                action={<Button variant="secondary" size="sm" onClick={handleClearFilters}>Clear filters</Button>}
              />
            ) : (
              <EmptyState
                icon={Inbox}
                title="No buses"
                description="Fleet data will appear when buses are registered"
              />
            )}
          </div>
        ) : (
          filteredBuses.map((bus) => (
            <button
              key={bus.busId}
              className={`fleet-row ${selectedBusId === bus.busId ? 'fleet-row-selected' : ''}`}
              onClick={() => onBusSelect?.(bus.busId)}
              type="button"
              aria-selected={selectedBusId === bus.busId}
            >
              <span className="row-line-1">
                <span className="row-bus" title={getBusDisplayName(bus)}>{getBusDisplayName(bus)}</span>
                <Badge variant={isOnline(bus) ? 'success' : 'offline'}>
                  {isOnline(bus) ? 'Online' : 'Offline'}
                </Badge>
              </span>
              <span className="row-line-2">
                <span className="row-driver" title={getDriverDisplayName(bus)}>{getDriverDisplayName(bus)}</span>
                <span className="row-separator">•</span>
                <span className="row-route" title={getRouteDisplay(bus)}>{getRouteDisplay(bus)}</span>
              </span>
              <span className="row-line-3">
                <span 
                  className="freshness-dot" 
                  style={{ backgroundColor: getFreshnessColor(bus) }}
                />
                <span className="freshness-age" title={formatFullTimestamp(bus)}>
                  {formatRelativeAge(bus)}
                </span>
                {!hasValidGps(bus) && (
                  <span className="row-no-gps">
                    {renderIcon(MapPinOff, { size: 12 })}
                    No GPS
                  </span>
                )}
              </span>
            </button>
          ))
        )}
      </div>

      <KeyboardShortcuts isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
};

export default React.memo(FleetPanel);

/**
 * Fleet utility functions for Live Monitoring
 */

/**
 * Check if a bus has stale GPS data (case-insensitive)
 * @param {Object} bus - Bus object
 * @returns {boolean}
 */
export const isStale = (bus) => {
  if (!bus?.freshness?.state) return false;
  return bus.freshness.state.toUpperCase() === 'STALE';
};

/**
 * Check if a bus is online
 * @param {Object} bus - Bus object
 * @returns {boolean}
 */
export const isOnline = (bus) => {
  return bus?.tracking?.isOnline === true;
};

/**
 * Check if a bus has valid GPS coordinates
 * @param {Object} bus - Bus object
 * @returns {boolean}
 */
export const hasValidGps = (bus) => {
  const lat = bus?.tracking?.latitude;
  const lng = bus?.tracking?.longitude;
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

/**
 * Get freshness age in seconds
 * @param {Object} bus - Bus object
 * @returns {number|null}
 */
export const getFreshnessAge = (bus) => {
  return bus?.freshness?.ageSeconds ?? null;
};

/**
 * Get freshness color based on age thresholds
 * @param {Object} bus - Bus object
 * @returns {string} - CSS color token or value
 */
export const getFreshnessColor = (bus) => {
  const age = getFreshnessAge(bus);
  if (age === null) return 'var(--color-neutral-400)';
  if (age < 30) return 'var(--color-success)';
  if (age < 120) return 'var(--color-warning)';
  return 'var(--color-danger)';
};

/**
 * Format freshness age for display
 * @param {Object} bus - Bus object
 * @returns {string}
 */
export const formatFreshnessAge = (bus) => {
  const age = getFreshnessAge(bus);
  if (age === null) return '—';
  if (age < 60) return `${age}s ago`;
  if (age < 3600) return `${Math.floor(age / 60)}m ago`;
  return `${Math.floor(age / 3600)}h ago`;
};

/**
 * Check if a bus is actively tracking (has valid GPS and is online)
 * @param {Object} bus - Bus object
 * @returns {boolean}
 */
export const isActivelyTracking = (bus) => {
  return isOnline(bus) && hasValidGps(bus);
};

/**
 * Get bus display name (bus number or bus ID)
 * @param {Object} bus - Bus object
 * @returns {string}
 */
export const getBusDisplayName = (bus) => {
  return bus?.busNumber || bus?.busId || '—';
};

/**
 * Get driver display name
 * @param {Object} bus - Bus object
 * @returns {string}
 */
export const getDriverDisplayName = (bus) => {
  const driver = bus?.driver;
  if (!driver) return 'Unassigned';
  return driver.driverName || driver.driverId || '—';
};

/**
 * Format relative age for display
 * @param {Object} bus - Bus object or timestamp
 * @returns {string}
 */
export const formatRelativeAge = (busOrTimestamp) => {
  let timestamp;
  if (busOrTimestamp && typeof busOrTimestamp === 'object') {
    timestamp = busOrTimestamp?.tracking?.lastUpdated;
  } else {
    timestamp = busOrTimestamp;
  }
  
  if (!timestamp) return 'N/A';
  
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 48) return `${hours} h ago`;
  return `${days} days ago`;
};

/**
 * Get full timestamp string for title/tooltip
 * @param {Object} bus - Bus object or timestamp
 * @returns {string}
 */
export const formatFullTimestamp = (busOrTimestamp) => {
  let timestamp;
  if (busOrTimestamp && typeof busOrTimestamp === 'object') {
    timestamp = busOrTimestamp?.tracking?.lastUpdated;
  } else {
    timestamp = busOrTimestamp;
  }
  
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Get route display text
 * @param {Object} bus - Bus object
 * @returns {string}
 */
export const getRouteDisplay = (bus) => {
  const assignment = bus?.assignment;
  if (assignment?.routeName) return assignment.routeName;
  if (assignment?.from && assignment?.to) {
    const via = assignment?.via ? ` → ${assignment.via}` : '';
    return `${assignment.from}${via} → ${assignment.to}`;
  }
  const trackingRoute = bus?.tracking?.route;
  return trackingRoute || '—';
};

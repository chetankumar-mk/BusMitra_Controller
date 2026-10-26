import { BUS_ONLINE_THRESHOLD_SECONDS } from '../config/operationsConfig.js';

/**
 * Determine if a bus is online based on lastUpdated timestamp
 * @param {number} lastUpdated - Timestamp in milliseconds
 * @returns {boolean} - True if online, false if offline
 */
const isBusOnline = (lastUpdated) => {
  if (!lastUpdated) return false;
  const now = Date.now();
  const thresholdMs = BUS_ONLINE_THRESHOLD_SECONDS * 1000;
  return (now - lastUpdated) <= thresholdMs;
};

/**
 * Normalize tracking source from Firebase data
 * @param {string} trackingSource - Raw tracking source from Firebase
 * @returns {string} - Normalized tracking source
 */
const normalizeTrackingSource = (trackingSource) => {
  if (!trackingSource) return 'UNKNOWN';
  
  const source = trackingSource.toUpperCase();
  
  // Recognize existing source categories
  const knownSources = ['LIVE', 'GHAT_RADIO', 'COMMUNITY_VERIFIED', 'AI_PREDICTED', 'LAST_KNOWN'];
  
  if (knownSources.includes(source)) {
    return source;
  }
  
  return 'UNKNOWN';
};

/**
 * Normalize tracking state from /buses status
 * @param {string} status - Raw status from /buses
 * @returns {string} - Normalized tracking state
 */
const normalizeTrackingState = (status) => {
  if (!status) return 'UNKNOWN';
  
  const normalizedStatus = status.toUpperCase();
  
  if (normalizedStatus === 'ACTIVE') return 'ACTIVE';
  if (normalizedStatus === 'INACTIVE') return 'INACTIVE';
  
  return 'UNKNOWN';
};

/**
 * Derive driver state from driver data
 * @param {object} driver - Driver object from /controller_drivers
 * @returns {string} - Driver state
 */
const deriveDriverState = (driver) => {
  if (!driver) return 'UNKNOWN';
  
  if (driver.firebaseUid && driver.firebaseUid.length > 0) {
    return 'LINKED';
  }
  
  return 'NOT_LINKED';
};

/**
 * Derive assignment state from assignment data
 * @param {object} assignment - Assignment object from /controller_assignments
 * @returns {string} - Assignment state
 */
const deriveAssignmentState = (assignment) => {
  if (!assignment) return 'UNASSIGNED';
  
  const status = assignment.status?.toUpperCase();
  
  if (status === 'ASSIGNED') return 'ASSIGNED';
  
  return 'UNASSIGNED';
};

/**
 * Validate GPS coordinates
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {boolean} - True if coordinates are valid
 */
const validateCoordinates = (latitude, longitude) => {
  if (latitude === null || latitude === undefined || 
      longitude === null || longitude === undefined) {
    return false;
  }
  
  // Valid latitude: -90 to 90
  // Valid longitude: -180 to 180
  return latitude >= -90 && latitude <= 90 && 
         longitude >= -180 && longitude <= 180;
};

/**
 * Derive location state from GPS data
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {string} - Location state
 */
const deriveLocationState = (latitude, longitude) => {
  if (validateCoordinates(latitude, longitude)) {
    return 'AVAILABLE';
  }
  
  return 'UNAVAILABLE';
};

/**
 * Derive freshness state from lastUpdated timestamp
 * @param {number} lastUpdated - Timestamp in milliseconds
 * @returns {object} - Freshness state with state and ageSeconds
 */
const deriveFreshness = (lastUpdated) => {
  if (!lastUpdated) {
    return {
      state: 'UNKNOWN',
      ageSeconds: null
    };
  }
  
  const now = Date.now();
  const ageMs = now - lastUpdated;
  const ageSeconds = Math.floor(ageMs / 1000);
  
  const thresholdMs = BUS_ONLINE_THRESHOLD_SECONDS * 1000;
  
  if (ageMs <= thresholdMs) {
    return {
      state: 'FRESH',
      ageSeconds
    };
  }
  
  return {
    state: 'STALE',
    ageSeconds
  };
};

/**
 * Derive comprehensive operational state for a bus
 * @param {object} bus - Bus object from /buses
 * @param {object} driver - Driver object from /controller_drivers (may be null)
 * @param {object} assignment - Assignment object from /controller_assignments (may be null)
 * @returns {object} - Normalized operational state
 */
const deriveOperationalState = (bus, driver, assignment) => {
  // Bus State: ONLINE/OFFLINE based on lastUpdated
  const busState = isBusOnline(bus.lastUpdated) ? 'ONLINE' : 'OFFLINE';
  
  // Tracking State: ACTIVE/INACTIVE/UNKNOWN based on /buses status
  const trackingState = normalizeTrackingState(bus.status);
  
  // Tracking Source: Normalize from trackingSource or source field
  const trackingSource = normalizeTrackingSource(bus.trackingSource || bus.source);
  
  // Assignment State: ASSIGNED/UNASSIGNED based on assignment
  const assignmentState = deriveAssignmentState(assignment);
  
  // Driver State: LINKED/NOT_LINKED/UNKNOWN based on driver.firebaseUid
  const driverState = deriveDriverState(driver);
  
  // Location State: AVAILABLE/UNAVAILABLE based on GPS coordinates
  const locationState = deriveLocationState(bus.lat, bus.lng);
  
  return {
    busState,
    trackingState,
    trackingSource,
    assignmentState,
    driverState,
    locationState
  };
};

export {
  isBusOnline,
  normalizeTrackingSource,
  normalizeTrackingState,
  deriveDriverState,
  deriveAssignmentState,
  validateCoordinates,
  deriveLocationState,
  deriveFreshness,
  deriveOperationalState
};

/**
 * Route Data Model
 * Controller-side route system for BusMitra
 */

export const RouteStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

/**
 * Create a route object
 * @param {Object} data - Route data
 * @returns {Object} Route object
 */
export function createRoute(data) {
  const now = Date.now();
  return {
    routeId: data.routeId || generateRouteId(),
    routeName: data.routeName || null,
    from: data.from || null,
    via: data.via || null,
    to: data.to || null,
    status: data.status || RouteStatus.ACTIVE,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

/**
 * Generate a unique route ID
 * @returns {string} Route ID
 */
function generateRouteId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `route_${timestamp}_${random}`;
}

/**
 * Validate route data
 * @param {Object} data - Route data to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateRouteData(data) {
  const errors = [];

  if (!data.routeName || typeof data.routeName !== 'string') {
    errors.push('routeName is required and must be a string');
  }

  if (!data.from || typeof data.from !== 'string') {
    errors.push('from is required and must be a string');
  }

  if (!data.to || typeof data.to !== 'string') {
    errors.push('to is required and must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extract route information from bus data
 * @param {Object} busData - Bus data from Firebase
 * @returns {Object} Route information
 */
export function extractRouteFromBus(busData) {
  return {
    from: busData.from || null,
    via: busData.via || null,
    to: busData.to || null,
    route: busData.route || null
  };
}

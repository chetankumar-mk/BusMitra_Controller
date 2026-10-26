/**
 * Controller Driver Data Model
 * Controller-side driver registry for BusMitra
 */

export const DriverStatus = {
  REGISTERED: 'REGISTERED',
  CONNECTED: 'CONNECTED',
  ASSIGNED: 'ASSIGNED',
  OFFLINE: 'OFFLINE'
};

/**
 * Create a Controller driver record
 * @param {Object} data - Driver data
 * @returns {Object} Driver object
 */
export function createControllerDriver(data) {
  const now = Date.now();
  
  return {
    driverId: data.driverId,
    driverName: data.driverName,
    registeredDeviceId: data.registeredDeviceId,
    firebaseUid: data.firebaseUid || null,
    status: data.status || DriverStatus.REGISTERED,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

/**
 * Validate Controller driver registration data
 * @param {Object} data - Driver data to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateControllerDriverData(data) {
  const errors = [];

  if (!data.driverId || typeof data.driverId !== 'string') {
    errors.push('driverId is required and must be a string');
  } else if (!/^[A-Za-z0-9]+$/.test(data.driverId)) {
    errors.push('driverId must contain only alphanumeric characters');
  }

  if (!data.driverName || typeof data.driverName !== 'string') {
    errors.push('driverName is required and must be a string');
  } else if (data.driverName.trim().length === 0) {
    errors.push('driverName cannot be empty');
  }

  if (!data.registeredDeviceId || typeof data.registeredDeviceId !== 'string') {
    errors.push('registeredDeviceId is required and must be a string');
  } else if (!/^[A-Za-z0-9]+$/.test(data.registeredDeviceId)) {
    errors.push('registeredDeviceId must contain only alphanumeric characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Update Controller driver record
 * @param {Object} existingDriver - Existing driver record
 * @param {Object} updates - Updates to apply
 * @returns {Object} Updated driver object
 */
export function updateControllerDriver(existingDriver, updates) {
  return {
    ...existingDriver,
    ...updates,
    updatedAt: Date.now()
  };
}

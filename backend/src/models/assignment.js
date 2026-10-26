/**
 * Assignment Data Model
 * Controller-side assignment system for BusMitra
 */

export const AssignmentStatus = {
  SCHEDULED: 'SCHEDULED',
  ASSIGNED: 'ASSIGNED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  UNASSIGNED: 'UNASSIGNED'
};

/**
 * Create an assignment object
 * @param {Object} data - Assignment data
 * @returns {Object} Assignment object
 */
export function createAssignment(data) {
  const now = Date.now();
  
  return {
    assignmentId: data.assignmentId || generateAssignmentId(),
    driverId: data.driverId,
    driverUid: data.driverUid || null,
    driverName: data.driverName || null,
    busId: data.busId || null,
    busNumber: data.busNumber,
    routeId: data.routeId || null,
    routeName: data.routeName || null,
    from: data.from,
    via: data.via || null,
    to: data.to,
    scheduledDate: data.scheduledDate,
    scheduledDepartureTime: data.scheduledDepartureTime,
    status: data.status || AssignmentStatus.ASSIGNED,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

/**
 * Generate a unique assignment ID
 * @returns {string} Assignment ID
 */
function generateAssignmentId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `assignment_${timestamp}_${random}`;
}

/**
 * Validate assignment data
 * @param {Object} data - Assignment data to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateAssignmentData(data) {
  const errors = [];

  if (!data.driverId || typeof data.driverId !== 'string') {
    errors.push('driverId is required and must be a string');
  }

  if (!data.busNumber || typeof data.busNumber !== 'string') {
    errors.push('busNumber is required and must be a string');
  }

  if (!data.from || typeof data.from !== 'string') {
    errors.push('from is required and must be a string');
  }

  if (!data.to || typeof data.to !== 'string') {
    errors.push('to is required and must be a string');
  }

  if (!data.scheduledDate || typeof data.scheduledDate !== 'string') {
    errors.push('scheduledDate is required and must be a string (YYYY-MM-DD)');
  } else if (!isValidDate(data.scheduledDate)) {
    errors.push('scheduledDate must be a valid date in YYYY-MM-DD format');
  }

  if (!data.scheduledDepartureTime || typeof data.scheduledDepartureTime !== 'string') {
    errors.push('scheduledDepartureTime is required and must be a string (HH:mm)');
  } else if (!isValidTime(data.scheduledDepartureTime)) {
    errors.push('scheduledDepartureTime must be a valid time in HH:mm format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateStr - Date string
 * @returns {boolean} Valid or not
 */
function isValidDate(dateStr) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validate time format (HH:mm)
 * @param {string} timeStr - Time string
 * @returns {boolean} Valid or not
 */
function isValidTime(timeStr) {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeStr);
}

/**
 * Convert bus number to bus ID
 * @param {string} busNumber - Bus number (e.g., "101", "038")
 * @returns {string} Bus ID (e.g., "bus_101", "bus_038")
 */
export function convertBusNumberToBusId(busNumber) {
  return `bus_${busNumber}`;
}

/**
 * Check for scheduling conflicts
 * @param {Object} assignments - All existing assignments
 * @param {string} driverId - Driver ID to check
 * @param {string} busId - Bus ID to check
 * @param {string} scheduledDate - Scheduled date
 * @param {string} scheduledDepartureTime - Scheduled departure time
 * @param {string} excludeAssignmentId - Assignment ID to exclude from conflict check (for updates)
 * @returns {Object} Conflict check result with hasConflict and conflictType
 */
export function checkScheduleConflict(assignments, driverId, busId, scheduledDate, scheduledDepartureTime, excludeAssignmentId = null) {
  const conflictingAssignments = [];
  
  for (const [assignmentId, assignment] of Object.entries(assignments)) {
    // Skip the assignment being updated
    if (excludeAssignmentId && assignmentId === excludeAssignmentId) {
      continue;
    }
    
    // Skip cancelled or completed assignments
    if (assignment.status === AssignmentStatus.CANCELLED || assignment.status === AssignmentStatus.COMPLETED) {
      continue;
    }
    
    // Check for same scheduled date and time
    if (assignment.scheduledDate === scheduledDate && assignment.scheduledDepartureTime === scheduledDepartureTime) {
      // Check driver conflict
      if (assignment.driverId === driverId) {
        conflictingAssignments.push({
          type: 'driver',
          assignmentId,
          message: 'Driver already has an assignment at this scheduled time'
        });
      }
      
      // Check bus conflict
      if (assignment.busId === busId) {
        conflictingAssignments.push({
          type: 'bus',
          assignmentId,
          message: 'Bus already has an assignment at this scheduled time'
        });
      }
    }
  }
  
  return {
    hasConflict: conflictingAssignments.length > 0,
    conflicts: conflictingAssignments
  };
}

/**
 * Validate assignment status transition
 * @param {string} currentStatus - Current assignment status
 * @param {string} newStatus - New assignment status
 * @returns {Object} Validation result with isValid and error
 */
export function validateStatusTransition(currentStatus, newStatus) {
  const validTransitions = {
    [AssignmentStatus.SCHEDULED]: [AssignmentStatus.ASSIGNED, AssignmentStatus.CANCELLED],
    [AssignmentStatus.ASSIGNED]: [AssignmentStatus.ACTIVE, AssignmentStatus.CANCELLED, AssignmentStatus.UNASSIGNED],
    [AssignmentStatus.ACTIVE]: [AssignmentStatus.COMPLETED, AssignmentStatus.CANCELLED],
    [AssignmentStatus.COMPLETED]: [], // Terminal state
    [AssignmentStatus.CANCELLED]: [], // Terminal state
    [AssignmentStatus.UNASSIGNED]: [AssignmentStatus.SCHEDULED, AssignmentStatus.ASSIGNED]
  };
  
  const allowedTransitions = validTransitions[currentStatus] || [];
  
  if (!allowedTransitions.includes(newStatus)) {
    return {
      isValid: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
    };
  }
  
  return {
    isValid: true,
    error: null
  };
}

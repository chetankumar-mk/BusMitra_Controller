import express from 'express';
import { getDatabase } from '../config/firebaseAdmin.js';
import { deriveOperationalState, isBusOnline, deriveFreshness, deriveLocationState } from '../helpers/operationalState.js';

const router = express.Router();

const CONTROLLER_DRIVERS_PATH = 'controller_drivers';
const CONTROLLER_ASSIGNMENTS_PATH = 'controller_assignments';
const BUSES_PATH = 'buses';

/**
 * GET /api/controller/operations/bus/:busId
 * Returns detailed operational information for a specific bus
 */
router.get('/bus/:busId', async (req, res) => {
  try {
    const { busId } = req.params;
    const db = getDatabase();

    // Fetch bus data
    const busSnapshot = await db.ref(`${BUSES_PATH}/${busId}`).once('value');
    const bus = busSnapshot.val();

    if (!bus) {
      return res.status(404).json({
        success: false,
        error: 'Bus not found'
      });
    }

    // Fetch all assignments to find current assignment for this bus
    const assignmentsSnapshot = await db.ref(CONTROLLER_ASSIGNMENTS_PATH).once('value');
    const assignments = assignmentsSnapshot.val() || {};

    // Find current assignment (status: ASSIGNED)
    const currentAssignment = Object.values(assignments).find(
      assignment => assignment.busId === busId && assignment.status === 'ASSIGNED'
    ) || null;

    // Fetch driver data if assignment exists
    let driver = null;
    if (currentAssignment && currentAssignment.driverId) {
      const driverSnapshot = await db.ref(`${CONTROLLER_DRIVERS_PATH}/${currentAssignment.driverId}`).once('value');
      driver = driverSnapshot.val() || null;
    }

    // Determine tracking source
    const trackingSource = bus.trackingSource || bus.source || 'UNKNOWN';

    // Derive freshness
    const freshness = deriveFreshness(bus.lastUpdated);

    // Derive location state
    const location = {
      state: deriveLocationState(bus.lat, bus.lng)
    };

    // Build response
    const response = {
      success: true,
      bus: {
        busId,
        busNumber: bus.busNumber || null
      },
      driver: driver ? {
        driverId: driver.driverId || null,
        driverName: driver.driverName || null,
        registeredDeviceId: driver.registeredDeviceId || null,
        firebaseLinked: !!(driver.firebaseUid && driver.firebaseUid.length > 0)
      } : null,
      assignment: currentAssignment ? {
        assignmentId: currentAssignment.assignmentId || null,
        from: currentAssignment.from || null,
        via: currentAssignment.via || null,
        to: currentAssignment.to || null,
        scheduledDate: currentAssignment.scheduledDate || null,
        scheduledDepartureTime: currentAssignment.scheduledDepartureTime || null,
        status: currentAssignment.status || null
      } : null,
      tracking: {
        status: bus.status || 'unknown',
        latitude: bus.lat || null,
        longitude: bus.lng || null,
        accuracy: bus.accuracy || null,
        speed: bus.speed || null,
        lastUpdated: bus.lastUpdated || null,
        trackingSource
      },
      freshness,
      location,
      operationalState: deriveOperationalState(bus, driver, currentAssignment)
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching bus operational state:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bus operational state',
      error: error.message
    });
  }
});

/**
 * GET /api/controller/operations/summary
 * Returns operational summary statistics
 */
router.get('/summary', async (req, res) => {
  try {
    const db = getDatabase();

    // Fetch all Controller drivers
    const driversSnapshot = await db.ref(CONTROLLER_DRIVERS_PATH).once('value');
    const drivers = driversSnapshot.val() || {};
    const driverIds = Object.keys(drivers);

    // Count Firebase-linked drivers
    const firebaseLinkedDrivers = Object.values(drivers).filter(
      driver => driver.firebaseUid && driver.firebaseUid.length > 0
    ).length;

    // Fetch all Controller assignments
    const assignmentsSnapshot = await db.ref(CONTROLLER_ASSIGNMENTS_PATH).once('value');
    const assignments = assignmentsSnapshot.val() || {};

    // Count active assignments (status: ASSIGNED)
    const activeAssignments = Object.values(assignments).filter(
      assignment => assignment.status === 'ASSIGNED'
    ).length;

    // Count unassigned drivers (drivers with no active assignment)
    const assignedDriverIds = Object.values(assignments)
      .filter(assignment => assignment.status === 'ASSIGNED')
      .map(assignment => assignment.driverId);
    const unassignedDrivers = driverIds.filter(
      driverId => !assignedDriverIds.includes(driverId)
    ).length;

    // Fetch all buses from /buses
    const busesSnapshot = await db.ref(BUSES_PATH).once('value');
    const buses = busesSnapshot.val() || {};
    const busIds = Object.keys(buses);

    // Count tracked buses
    const trackedBuses = busIds.length;

    // Count online/offline buses
    let onlineBuses = 0;
    let offlineBuses = 0;
    let activeTrackingBuses = 0;

    Object.values(buses).forEach(bus => {
      if (isBusOnline(bus.lastUpdated)) {
        onlineBuses++;
      } else {
        offlineBuses++;
      }
      
      if (bus.status === 'active') {
        activeTrackingBuses++;
      }
    });

    // Count assigned/unassigned buses
    const assignedBusIds = Object.values(assignments)
      .filter(assignment => assignment.status === 'ASSIGNED')
      .map(assignment => assignment.busId);
    const assignedBuses = assignedBusIds.length;
    const unassignedBuses = busIds.filter(
      busId => !assignedBusIds.includes(busId)
    ).length;

    // Count linked/unlinked drivers
    const linkedDrivers = Object.values(drivers).filter(
      driver => driver.firebaseUid && driver.firebaseUid.length > 0
    ).length;
    const unlinkedDrivers = driverIds.length - linkedDrivers;

    res.json({
      success: true,
      summary: {
        registeredDrivers: driverIds.length,
        firebaseLinkedDrivers,
        activeAssignments,
        unassignedDrivers,
        trackedBuses,
        onlineBuses,
        offlineBuses,
        activeTrackingBuses,
        assignedBuses,
        unassignedBuses,
        linkedDrivers,
        unlinkedDrivers
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching operations summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch operations summary',
      error: error.message
    });
  }
});

/**
 * GET /api/controller/operations/fleet
 * Returns combined fleet data from Controller assignments and operational tracking
 */
router.get('/fleet', async (req, res) => {
  try {
    const db = getDatabase();

    // Fetch all data sources
    const [driversSnapshot, assignmentsSnapshot, busesSnapshot] = await Promise.all([
      db.ref(CONTROLLER_DRIVERS_PATH).once('value'),
      db.ref(CONTROLLER_ASSIGNMENTS_PATH).once('value'),
      db.ref(BUSES_PATH).once('value')
    ]);

    const drivers = driversSnapshot.val() || {};
    const assignments = assignmentsSnapshot.val() || {};
    const buses = busesSnapshot.val() || {};

    // Build busId -> assignment mapping
    const busIdToAssignment = {};
    Object.values(assignments).forEach(assignment => {
      if (assignment.status === 'ASSIGNED' && assignment.busId) {
        busIdToAssignment[assignment.busId] = assignment;
      }
    });

    // Build driverId -> driver mapping
    const driverIdToDriver = {};
    Object.entries(drivers).forEach(([driverId, driver]) => {
      driverIdToDriver[driverId] = driver;
    });

    // Combine data for each bus
    const fleetData = Object.entries(buses).map(([busId, bus]) => {
      const assignment = busIdToAssignment[busId] || null;
      const driver = assignment ? driverIdToDriver[assignment.driverId] : null;

      // Determine tracking status
      const trackingStatus = bus.status || 'unknown';
      const isOnline = isBusOnline(bus.lastUpdated);

      // Determine tracking source (use existing field if available)
      const trackingSource = bus.trackingSource || bus.source || 'Unknown';

      // Derive operational state
      const operationalState = deriveOperationalState(bus, driver, assignment);

      // Derive freshness
      const freshness = deriveFreshness(bus.lastUpdated);

      // Derive location state
      const location = {
        state: deriveLocationState(bus.lat, bus.lng)
      };

      return {
        busId,
        busNumber: bus.busNumber || null,
        driver: driver ? {
          driverId: driver.driverId || null,
          driverName: driver.driverName || null,
          firebaseLinked: !!(driver.firebaseUid && driver.firebaseUid.length > 0),
          registeredDeviceId: driver.registeredDeviceId || null
        } : null,
        assignment: assignment ? {
          assignmentId: assignment.assignmentId || null,
          from: assignment.from || null,
          via: assignment.via || null,
          to: assignment.to || null,
          scheduledDate: assignment.scheduledDate || null,
          scheduledDepartureTime: assignment.scheduledDepartureTime || null,
          status: assignment.status || null
        } : null,
        tracking: {
          status: trackingStatus,
          latitude: bus.lat || null,
          longitude: bus.lng || null,
          accuracy: bus.accuracy || null,
          lastUpdated: bus.lastUpdated || null,
          route: bus.route || null,
          speed: bus.speed || null,
          isOnline,
          trackingSource
        },
        freshness,
        location,
        operationalState
      };
    });

    res.json({
      success: true,
      buses: fleetData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching fleet data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fleet data',
      error: error.message
    });
  }
});

export default router;

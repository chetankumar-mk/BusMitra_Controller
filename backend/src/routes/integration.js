import express from 'express';
import { getDatabase } from '../config/firebaseAdmin.js';

const router = express.Router();

const CONTROLLER_DRIVERS_PATH = '/controller_drivers';
const CONTROLLER_ASSIGNMENTS_PATH = '/controller_assignments';

/**
 * GET /api/integration/driver/:driverId/assignment
 * Returns driver information and their current assignment
 */
router.get('/driver/:driverId/assignment', async (req, res) => {
  try {
    const { driverId } = req.params;
    const db = getDatabase();

    // Step 1: Find driver in Controller registry
    const driverRef = db.ref(`${CONTROLLER_DRIVERS_PATH}/${driverId}`);
    const driverSnapshot = await driverRef.once('value');

    if (!driverSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        error: `Driver with ID ${driverId} not found in Controller registry`
      });
    }

    const driver = driverSnapshot.val();

    // Step 2: Find driver's active assignment
    const assignmentsRef = db.ref(CONTROLLER_ASSIGNMENTS_PATH);
    const assignmentsSnapshot = await assignmentsRef.once('value');

    let assignment = null;
    if (assignmentsSnapshot.exists()) {
      const assignmentsData = assignmentsSnapshot.val();
      
      // Find assignments for this driver
      const driverAssignments = Object.entries(assignmentsData)
        .filter(([_, assignmentData]) => assignmentData.driverId === driverId)
        .map(([assignmentId, assignmentData]) => ({
          assignmentId,
          ...assignmentData
        }));

      // Prefer active/latest assignment (ASSIGNED status, most recent)
      const activeAssignments = driverAssignments.filter(a => a.status === 'ASSIGNED');
      
      if (activeAssignments.length > 0) {
        // Sort by createdAt descending to get the most recent
        activeAssignments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        assignment = activeAssignments[0];
      }
    }

    // Step 3: Return driver and assignment
    const responseData = {
      success: true,
      driver: {
        driverId: driver.driverId,
        driverName: driver.driverName,
        registeredDeviceId: driver.registeredDeviceId,
        firebaseUid: driver.firebaseUid
      },
      assignment: assignment ? {
        assignmentId: assignment.assignmentId,
        busNumber: assignment.busNumber,
        busId: assignment.busId,
        from: assignment.from,
        via: assignment.via,
        to: assignment.to,
        scheduledDate: assignment.scheduledDate,
        scheduledDepartureTime: assignment.scheduledDepartureTime,
        status: assignment.status
      } : null
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching driver assignment:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch driver assignment'
    });
  }
});

/**
 * GET /api/integration/firebase-driver/:firebaseUid/assignment
 * Returns driver information and assignment by Firebase UID
 * 
 * SECURITY NOTE:
 * This endpoint is for integration readiness testing only.
 * In production, the Driver App should authenticate using a Firebase ID token,
 * and the backend should verify that token with Firebase Admin SDK before
 * returning assignment data.
 * 
 * TODO: Implement Firebase ID token verification for secure Driver App integration.
 */
router.get('/firebase-driver/:firebaseUid/assignment', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const db = getDatabase();

    // Step 1: Search for driver with matching firebaseUid
    const driversRef = db.ref(CONTROLLER_DRIVERS_PATH);
    const driversSnapshot = await driversRef.once('value');

    if (!driversSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        error: 'Driver Firebase UID is not linked to Controller'
      });
    }

    const driversData = driversSnapshot.val();
    let matchedDriver = null;

    for (const [driverId, driverData] of Object.entries(driversData)) {
      if (driverData.firebaseUid === firebaseUid) {
        matchedDriver = { driverId, ...driverData };
        break;
      }
    }

    if (!matchedDriver) {
      return res.status(404).json({
        success: false,
        error: 'Driver Firebase UID is not linked to Controller'
      });
    }

    // Step 2: Find driver's active assignment (same logic as driverId endpoint)
    const assignmentsRef = db.ref(CONTROLLER_ASSIGNMENTS_PATH);
    const assignmentsSnapshot = await assignmentsRef.once('value');

    let assignment = null;
    if (assignmentsSnapshot.exists()) {
      const assignmentsData = assignmentsSnapshot.val();
      
      const driverAssignments = Object.entries(assignmentsData)
        .filter(([_, assignmentData]) => assignmentData.driverId === matchedDriver.driverId)
        .map(([assignmentId, assignmentData]) => ({
          assignmentId,
          ...assignmentData
        }));

      const activeAssignments = driverAssignments.filter(a => a.status === 'ASSIGNED');
      
      if (activeAssignments.length > 0) {
        activeAssignments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        assignment = activeAssignments[0];
      }
    }

    // Step 3: Return driver and assignment
    const responseData = {
      success: true,
      driver: {
        driverId: matchedDriver.driverId,
        driverName: matchedDriver.driverName,
        registeredDeviceId: matchedDriver.registeredDeviceId,
        firebaseUid: matchedDriver.firebaseUid
      },
      assignment: assignment ? {
        assignmentId: assignment.assignmentId,
        busNumber: assignment.busNumber,
        busId: assignment.busId,
        from: assignment.from,
        via: assignment.via,
        to: assignment.to,
        scheduledDate: assignment.scheduledDate,
        scheduledDepartureTime: assignment.scheduledDepartureTime,
        status: assignment.status
      } : null
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching Firebase driver assignment:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch driver assignment'
    });
  }
});

/**
 * GET /api/integration/status
 * Returns integration service status
 */
router.get('/status', async (req, res) => {
  try {
    const db = getDatabase();
    
    // Check Firebase connectivity by attempting a simple read
    let firebaseConnected = false;
    try {
      await db.ref('/').once('value');
      firebaseConnected = true;
    } catch (error) {
      firebaseConnected = false;
    }

    // Count drivers and assignments
    let driverCount = 0;
    let linkedDriverCount = 0;
    let assignmentCount = 0;
    let assignedDriverCount = 0;

    try {
      const driversSnapshot = await db.ref(CONTROLLER_DRIVERS_PATH).once('value');
      if (driversSnapshot.exists()) {
        const driversData = driversSnapshot.val();
        driverCount = Object.keys(driversData).length;
        linkedDriverCount = Object.values(driversData).filter(d => d.firebaseUid).length;
      }
    } catch (error) {
      console.error('Error counting drivers:', error.message);
    }

    try {
      const assignmentsSnapshot = await db.ref(CONTROLLER_ASSIGNMENTS_PATH).once('value');
      if (assignmentsSnapshot.exists()) {
        const assignmentsData = assignmentsSnapshot.val();
        assignmentCount = Object.keys(assignmentsData).length;
        const assignedDriverIds = new Set(Object.values(assignmentsData).map(a => a.driverId));
        assignedDriverCount = assignedDriverIds.size;
      }
    } catch (error) {
      console.error('Error counting assignments:', error.message);
    }

    res.json({
      success: true,
      service: 'busmitra-controller-integration',
      firebase: firebaseConnected ? 'connected' : 'disconnected',
      assignmentApi: true,
      timestamp: Date.now(),
      statistics: {
        totalDrivers: driverCount,
        linkedDrivers: linkedDriverCount,
        totalAssignments: assignmentCount,
        assignedDrivers: assignedDriverCount,
        unassignedDrivers: driverCount - assignedDriverCount
      }
    });
  } catch (error) {
    console.error('Error fetching integration status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integration status'
    });
  }
});

export default router;

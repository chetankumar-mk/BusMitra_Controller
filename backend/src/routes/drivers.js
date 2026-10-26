import express from 'express';
import { getDatabase, getAuth } from '../config/firebaseAdmin.js';
import { createControllerDriver, validateControllerDriverData, DriverStatus } from '../models/controllerDriver.js';
import { updateDriverBusClaim, removeDriverBusClaim, getDriverBusClaim } from '../helpers/firebaseClaims.js';

const router = express.Router();

const CONTROLLER_DRIVERS_PATH = '/controller_drivers';
const CONTROLLER_ASSIGNMENTS_PATH = '/controller_assignments';

/**
 * GET /api/controller/drivers
 * Returns all Controller drivers from /controller_drivers
 */
router.get('/drivers', async (req, res) => {
  try {
    const db = getDatabase();
    const driversRef = db.ref(CONTROLLER_DRIVERS_PATH);
    const snapshot = await driversRef.once('value');

    if (!snapshot.exists()) {
      return res.json({
        success: true,
        drivers: []
      });
    }

    const driversData = snapshot.val();
    const drivers = [];

    for (const [driverId, driverData] of Object.entries(driversData)) {
      drivers.push({
        driverId,
        ...driverData
      });
    }

    res.json({
      success: true,
      drivers
    });
  } catch (error) {
    console.error('Error fetching Controller drivers:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Controller drivers',
      error: error.message
    });
  }
});

/**
 * POST /api/controller/drivers
 * Registers a new Controller driver manually
 */
router.post('/drivers', async (req, res) => {
  try {
    const { driverId, driverName, registeredDeviceId } = req.body;

    // Validate input data
    const validation = validateControllerDriverData({
      driverId,
      driverName,
      registeredDeviceId
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid driver data',
        errors: validation.errors
      });
    }

    const db = getDatabase();

    // Check for duplicate driverId
    const driverRef = db.ref(`${CONTROLLER_DRIVERS_PATH}/${driverId}`);
    const driverSnapshot = await driverRef.once('value');
    if (driverSnapshot.exists()) {
      return res.status(409).json({
        success: false,
        message: 'Driver ID already exists',
        error: 'A driver with this ID is already registered'
      });
    }

    // Check for duplicate registeredDeviceId
    const driversRef = db.ref(CONTROLLER_DRIVERS_PATH);
    const allDriversSnapshot = await driversRef.once('value');
    if (allDriversSnapshot.exists()) {
      const driversData = allDriversSnapshot.val();
      for (const existingDriver of Object.values(driversData)) {
        if (existingDriver.registeredDeviceId === registeredDeviceId) {
          return res.status(409).json({
            success: false,
            message: 'Device ID already registered',
            error: 'This device ID is already registered to another driver'
          });
        }
      }
    }

    // Create Controller driver record
    const driver = createControllerDriver({
      driverId,
      driverName,
      registeredDeviceId,
      firebaseUid: null,
      status: DriverStatus.REGISTERED
    });

    // Store in Firebase
    await driverRef.set(driver);

    res.status(201).json({
      success: true,
      driver
    });
  } catch (error) {
    console.error('Error registering Controller driver:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to register driver',
      error: error.message
    });
  }
});

/**
 * POST /api/controller/drivers/:driverId/link-firebase
 * Links a Firebase UID to a Controller driver
 * 
 * SECURITY TODO: Controller authentication and authorization must be implemented 
 * before exposing this API in production.
 */
router.post('/drivers/:driverId/link-firebase', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { firebaseUid } = req.body;

    // Validate firebaseUid is present
    if (!firebaseUid || typeof firebaseUid !== 'string' || firebaseUid.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Firebase UID is required and must be a non-empty string'
      });
    }

    const db = getDatabase();
    const auth = getAuth();

    // Step 1: Find Controller driver
    const driverRef = db.ref(`${CONTROLLER_DRIVERS_PATH}/${driverId}`);
    const driverSnapshot = await driverRef.once('value');

    if (!driverSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
        error: `Controller driver with ID ${driverId} does not exist`
      });
    }

    const driver = driverSnapshot.val();

    // Step 2: Check if already linked to this driver
    if (driver.firebaseUid === firebaseUid) {
      return res.status(400).json({
        success: false,
        message: 'Already linked',
        error: 'This Firebase UID is already linked to this driver'
      });
    }

    // Step 3: Verify Firebase user exists
    try {
      await auth.getUser(firebaseUid);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Firebase user not found',
        error: 'The specified Firebase UID does not exist in Firebase Authentication'
      });
    }

    // Step 4: Check if Firebase UID is already linked to another Controller driver
    const driversRef = db.ref(CONTROLLER_DRIVERS_PATH);
    const allDriversSnapshot = await driversRef.once('value');
    
    if (allDriversSnapshot.exists()) {
      const driversData = allDriversSnapshot.val();
      for (const [existingDriverId, existingDriver] of Object.entries(driversData)) {
        if (existingDriver.firebaseUid === firebaseUid && existingDriverId !== driverId) {
          return res.status(409).json({
            success: false,
            message: 'Firebase UID already linked',
            error: `This Firebase UID is already linked to driver ${existingDriverId}`
          });
        }
      }
    }

    // Step 5: Update driver with Firebase UID
    await driverRef.update({
      firebaseUid: firebaseUid,
      updatedAt: Date.now()
    });

    // Step 6: Check for existing assignment and update claim
    let claimUpdated = false;
    let claimBusId = null;
    let claimError = null;

    try {
      const assignmentsRef = db.ref(CONTROLLER_ASSIGNMENTS_PATH);
      const assignmentsSnapshot = await assignmentsRef.once('value');

      if (assignmentsSnapshot.exists()) {
        const assignmentsData = assignmentsSnapshot.val();
        
        // Find active assignment for this driver
        const driverAssignments = Object.entries(assignmentsData)
          .filter(([_, assignmentData]) => assignmentData.driverId === driverId && assignmentData.status === 'ASSIGNED')
          .map(([assignmentId, assignmentData]) => ({
            assignmentId,
            ...assignmentData
          }));

        if (driverAssignments.length > 0) {
          // Get most recent assignment
          driverAssignments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          const activeAssignment = driverAssignments[0];

          // Update Firebase custom claim
          const claimResult = await updateDriverBusClaim(firebaseUid, activeAssignment.busId);
          
          if (claimResult.success) {
            claimUpdated = true;
            claimBusId = activeAssignment.busId;
          } else {
            claimError = claimResult.error;
          }
        }
      }
    } catch (error) {
      console.error('Error updating Firebase claim during linking:', error.message);
      claimError = error.message;
    }

    // Step 7: Return updated driver
    const updatedDriver = {
      ...driver,
      firebaseUid: firebaseUid,
      updatedAt: Date.now()
    };

    res.json({
      success: true,
      message: 'Firebase UID linked successfully',
      driver: updatedDriver,
      firebaseLinked: true,
      claimUpdated,
      claimBusId,
      claimError
    });
  } catch (error) {
    console.error('Error linking Firebase UID:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to link Firebase UID',
      error: error.message
    });
  }
});

/**
 * GET /api/controller/drivers/:driverId/integration-status
 * Returns integration status for a specific driver
 */
router.get('/drivers/:driverId/integration-status', async (req, res) => {
  try {
    const { driverId } = req.params;
    const db = getDatabase();

    // Step 1: Find Controller driver
    const driverRef = db.ref(`${CONTROLLER_DRIVERS_PATH}/${driverId}`);
    const driverSnapshot = await driverRef.once('value');

    if (!driverSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
        error: `Controller driver with ID ${driverId} does not exist`
      });
    }

    const driver = driverSnapshot.val();

    // Step 2: Check for active assignment
    let hasAssignment = false;
    let busId = null;
    const assignmentsRef = db.ref(CONTROLLER_ASSIGNMENTS_PATH);
    const assignmentsSnapshot = await assignmentsRef.once('value');

    if (assignmentsSnapshot.exists()) {
      const assignmentsData = assignmentsSnapshot.val();
      
      const driverAssignments = Object.entries(assignmentsData)
        .filter(([_, assignmentData]) => assignmentData.driverId === driverId && assignmentData.status === 'ASSIGNED')
        .map(([assignmentId, assignmentData]) => ({
          assignmentId,
          ...assignmentData
        }));

      if (driverAssignments.length > 0) {
        driverAssignments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const activeAssignment = driverAssignments[0];
        hasAssignment = true;
        busId = activeAssignment.busId;
      }
    }

    // Step 3: Check Firebase claim if linked
    let claimBusId = null;
    let claimSynchronized = false;

    if (driver.firebaseUid) {
      try {
        const claimResult = await getDriverBusClaim(driver.firebaseUid);
        if (claimResult.success) {
          claimBusId = claimResult.busId;
          claimSynchronized = (claimBusId === busId);
        }
      } catch (error) {
        console.error('Error checking Firebase claim:', error.message);
      }
    }

    res.json({
      success: true,
      driverId: driver.driverId,
      firebaseLinked: !!driver.firebaseUid,
      firebaseUid: driver.firebaseUid,
      hasAssignment,
      busId,
      claimBusId,
      claimSynchronized
    });
  } catch (error) {
    console.error('Error fetching integration status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch integration status',
      error: error.message
    });
  }
});

export default router;

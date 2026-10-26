import express from 'express';
import { getDatabase, getAuth } from '../config/firebaseAdmin.js';
import { createAssignment, validateAssignmentData, AssignmentStatus, convertBusNumberToBusId, checkScheduleConflict, validateStatusTransition } from '../models/assignment.js';
import { updateDriverBusClaim, removeDriverBusClaim } from '../helpers/firebaseClaims.js';

const router = express.Router();

const ASSIGNMENTS_PATH = '/controller_assignments';
const CONTROLLER_DRIVERS_PATH = '/controller_drivers';

/**
 * GET /api/controller/assignments
 * Returns all assignments
 */
router.get('/assignments', async (req, res) => {
  try {
    const db = getDatabase();
    const assignmentsRef = db.ref(ASSIGNMENTS_PATH);
    const snapshot = await assignmentsRef.once('value');

    if (!snapshot.exists()) {
      return res.json({
        success: true,
        assignments: []
      });
    }

    const assignmentsData = snapshot.val();
    const assignments = [];

    for (const [assignmentId, assignmentData] of Object.entries(assignmentsData)) {
      assignments.push({
        assignmentId,
        ...assignmentData
      });
    }

    res.json({
      success: true,
      assignments
    });
  } catch (error) {
    console.error('Error fetching assignments:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments',
      error: error.message
    });
  }
});

/**
 * GET /api/controller/assignments/:assignmentId
 * Returns a specific assignment
 */
router.get('/assignments/:assignmentId', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const db = getDatabase();
    const assignmentRef = db.ref(`${ASSIGNMENTS_PATH}/${assignmentId}`);
    const snapshot = await assignmentRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    const assignmentData = snapshot.val();

    res.json({
      success: true,
      assignment: {
        assignmentId,
        ...assignmentData
      }
    });
  } catch (error) {
    console.error('Error fetching assignment:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignment',
      error: error.message
    });
  }
});

/**
 * POST /api/controller/assignments
 * Creates a new Controller-owned assignment
 */
router.post('/assignments', async (req, res) => {
  try {
    const { driverId, busNumber, from, via, to, scheduledDate, scheduledDepartureTime, routeId, status } = req.body;

    // Validate input data
    const validation = validateAssignmentData({
      driverId,
      busNumber,
      from,
      via,
      to,
      scheduledDate,
      scheduledDepartureTime
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignment data',
        errors: validation.errors
      });
    }

    const db = getDatabase();
    const auth = getAuth();

    // Step 1: Resolve driverId to Controller driver record
    const driverRef = db.ref(`${CONTROLLER_DRIVERS_PATH}/${driverId}`);
    const driverSnapshot = await driverRef.once('value');
    if (!driverSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
        error: 'Driver with specified ID does not exist in Controller registry'
      });
    }

    const controllerDriver = driverSnapshot.val();
    const firebaseUid = controllerDriver.firebaseUid;

    // Step 2: Convert busNumber to busId
    const busId = convertBusNumberToBusId(busNumber);

    // Step 3: Validate routeId if provided
    let routeName = null;
    if (routeId) {
      const routeRef = db.ref(`/controller_routes/${routeId}`);
      const routeSnapshot = await routeRef.once('value');
      if (!routeSnapshot.exists()) {
        return res.status(404).json({
          success: false,
          message: 'Route not found',
          error: 'Route with specified ID does not exist in Controller route registry'
        });
      }
      const routeData = routeSnapshot.val();
      routeName = routeData.routeName || null;
    }

    // Step 4: Check for scheduling conflicts
    const assignmentsRef = db.ref(ASSIGNMENTS_PATH);
    const assignmentsSnapshot = await assignmentsRef.once('value');
    const existingAssignments = assignmentsSnapshot.exists() ? assignmentsSnapshot.val() : {};

    const conflictCheck = checkScheduleConflict(
      existingAssignments,
      driverId,
      busId,
      scheduledDate,
      scheduledDepartureTime
    );

    if (conflictCheck.hasConflict) {
      const driverConflict = conflictCheck.conflicts.find(c => c.type === 'driver');
      const busConflict = conflictCheck.conflicts.find(c => c.type === 'bus');

      if (driverConflict) {
        return res.status(409).json({
          success: false,
          message: driverConflict.message,
          error: driverConflict.message
        });
      }

      if (busConflict) {
        return res.status(409).json({
          success: false,
          message: busConflict.message,
          error: busConflict.message
        });
      }
    }

    // Step 5: Create assignment record
    const assignment = createAssignment({
      driverId,
      driverUid: firebaseUid,
      driverName: controllerDriver.driverName,
      busId,
      busNumber,
      routeId: routeId || null,
      routeName: routeName,
      from,
      via,
      to,
      scheduledDate,
      scheduledDepartureTime,
      status: status || AssignmentStatus.ASSIGNED
    });

    // Step 6: Store assignment in Firebase
    const assignmentRef = db.ref(`${ASSIGNMENTS_PATH}/${assignment.assignmentId}`);
    await assignmentRef.set(assignment);

    // Step 7: Update driver's custom claim only if firebaseUid exists and status is ASSIGNED or ACTIVE
    if (firebaseUid && (assignment.status === AssignmentStatus.ASSIGNED || assignment.status === AssignmentStatus.ACTIVE)) {
      try {
        const claimResult = await updateDriverBusClaim(firebaseUid, busId);
        
        if (!claimResult.success) {
          console.warn('Failed to update driver custom claim:', claimResult.error);
          // Assignment is still valid, just return with warning
          return res.status(201).json({
            success: true,
            assignment,
            warning: 'Assignment created but Firebase custom claim update failed'
          });
        }
      } catch (claimError) {
        console.error('Failed to update driver custom claim:', claimError.message);
        // Assignment is still valid, just return with warning
        return res.status(201).json({
          success: true,
          assignment,
          warning: 'Assignment created but Firebase custom claim update failed'
        });
      }
    }

    res.status(201).json({
      success: true,
      assignment
    });
  } catch (error) {
    console.error('Error creating assignment:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create assignment',
      error: error.message
    });
  }
});

/**
 * PUT /api/controller/assignments/:assignmentId/status
 * Updates assignment status and handles Firebase claims
 */
router.put('/assignments/:assignmentId/status', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(AssignmentStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        error: 'Status must be one of: SCHEDULED, ASSIGNED, ACTIVE, COMPLETED, CANCELLED, UNASSIGNED'
      });
    }

    const db = getDatabase();
    const assignmentRef = db.ref(`${ASSIGNMENTS_PATH}/${assignmentId}`);
    const assignmentSnapshot = await assignmentRef.once('value');

    if (!assignmentSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    const assignment = assignmentSnapshot.val();
    const oldStatus = assignment.status;

    // Validate status transition
    const transitionValidation = validateStatusTransition(oldStatus, status);
    if (!transitionValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status transition',
        error: transitionValidation.error
      });
    }

    // Update assignment status
    await assignmentRef.update({
      status: status,
      updatedAt: Date.now()
    });

    // Handle Firebase claims when unassigning
    if (status === AssignmentStatus.UNASSIGNED && assignment.driverUid) {
      try {
        const claimResult = await removeDriverBusClaim(assignment.driverUid);
        
        if (!claimResult.success) {
          console.warn('Failed to remove driver bus claim:', claimResult.error);
          return res.status(200).json({
            success: true,
            message: 'Assignment status updated but Firebase claim removal failed',
            assignment: { ...assignment, status, updatedAt: Date.now() },
            warning: claimResult.error
          });
        }
      } catch (claimError) {
        console.error('Failed to remove driver bus claim:', claimError.message);
        return res.status(200).json({
          success: true,
          message: 'Assignment status updated but Firebase claim removal failed',
          assignment: { ...assignment, status, updatedAt: Date.now() },
          warning: claimError.message
        });
      }
    }

    // Handle Firebase claims when transitioning to ASSIGNED or ACTIVE
    if ((status === AssignmentStatus.ASSIGNED || status === AssignmentStatus.ACTIVE) && assignment.driverUid && assignment.busId) {
      try {
        const claimResult = await updateDriverBusClaim(assignment.driverUid, assignment.busId);
        
        if (!claimResult.success) {
          console.warn('Failed to update driver custom claim:', claimResult.error);
          return res.status(200).json({
            success: true,
            message: 'Assignment status updated but Firebase claim update failed',
            assignment: { ...assignment, status, updatedAt: Date.now() },
            warning: claimResult.error
          });
        }
      } catch (claimError) {
        console.error('Failed to update driver custom claim:', claimError.message);
        return res.status(200).json({
          success: true,
          message: 'Assignment status updated but Firebase claim update failed',
          assignment: { ...assignment, status, updatedAt: Date.now() },
          warning: claimError.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Assignment status updated successfully',
      assignment: { ...assignment, status, updatedAt: Date.now() }
    });
  } catch (error) {
    console.error('Error updating assignment status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update assignment status',
      error: error.message
    });
  }
});

export default router;

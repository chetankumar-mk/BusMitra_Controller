import express from 'express';
import { getDatabase } from '../config/firebaseAdmin.js';
import { normalizeTrackingSource, deriveFreshness, deriveLocationState } from '../helpers/operationalState.js';

const router = express.Router();

const BUSES_PATH = 'buses';

/**
 * GET /api/controller/tracking/bus/:busId
 * Returns current operational tracking data for a specific bus
 */
router.get('/bus/:busId', async (req, res) => {
  try {
    const { busId } = req.params;
    const db = getDatabase();

    // Fetch bus tracking data
    const busSnapshot = await db.ref(`${BUSES_PATH}/${busId}`).once('value');
    const bus = busSnapshot.val();

    if (!bus) {
      return res.status(404).json({
        success: false,
        error: 'Bus tracking record not found'
      });
    }

    // Determine tracking source
    const trackingSource = normalizeTrackingSource(bus.trackingSource || bus.source);

    // Derive freshness
    const freshness = deriveFreshness(bus.lastUpdated);

    // Derive location state
    const locationState = deriveLocationState(bus.lat, bus.lng);

    // Build response
    const response = {
      success: true,
      busId,
      tracking: {
        busNumber: bus.busNumber || null,
        status: bus.status || 'unknown',
        latitude: bus.lat || null,
        longitude: bus.lng || null,
        accuracy: bus.accuracy || null,
        speed: bus.speed || null,
        route: bus.route || null,
        trackingSource,
        lastUpdated: bus.lastUpdated || null
      },
      freshness,
      location: {
        state: locationState
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching bus tracking data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bus tracking data',
      error: error.message
    });
  }
});

export default router;

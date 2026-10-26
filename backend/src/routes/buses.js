import express from 'express';
import { getDatabase } from '../config/firebaseAdmin.js';

const router = express.Router();

/**
 * GET /api/controller/buses
 * Returns all buses from Firebase Realtime Database
 */
router.get('/buses', async (req, res) => {
  try {
    const db = getDatabase();
    const busesRef = db.ref('/buses');
    const snapshot = await busesRef.once('value');

    if (!snapshot.exists()) {
      return res.json({
        success: true,
        buses: []
      });
    }

    const busesData = snapshot.val();
    const buses = [];

    for (const [busId, busData] of Object.entries(busesData)) {
      buses.push({
        busId,
        busNumber: busData.busNumber || null,
        from: busData.from || null,
        via: busData.via || null,
        to: busData.to || null,
        route: busData.route || null,
        status: busData.status || 'unknown',
        lat: busData.lat || null,
        lng: busData.lng || null,
        accuracy: busData.accuracy || null,
        lastUpdated: busData.lastUpdated || null
      });
    }

    res.json({
      success: true,
      buses
    });
  } catch (error) {
    console.error('Error fetching buses:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch buses',
      error: error.message
    });
  }
});

/**
 * GET /api/controller/buses/:busId
 * Returns a specific bus from Firebase Realtime Database
 */
router.get('/buses/:busId', async (req, res) => {
  try {
    const { busId } = req.params;
    const db = getDatabase();
    const busRef = db.ref(`/buses/${busId}`);
    const snapshot = await busRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    const busData = snapshot.val();

    res.json({
      success: true,
      bus: {
        busId,
        ...busData
      }
    });
  } catch (error) {
    console.error('Error fetching bus:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bus',
      error: error.message
    });
  }
});

export default router;

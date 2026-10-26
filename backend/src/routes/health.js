import express from 'express';
import { isFirebaseConfigured } from '../config/firebaseAdmin.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const firebaseConfigured = await isFirebaseConfigured();
    
    res.json({
      success: true,
      service: 'busmitra-controller-backend',
      firebaseConfigured,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'not configured'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: 'busmitra-controller-backend',
      firebaseConfigured: false,
      message: 'Service unavailable',
      error: error.message
    });
  }
});

export default router;

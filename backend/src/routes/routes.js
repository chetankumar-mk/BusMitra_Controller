import express from 'express';
import { getDatabase } from '../config/firebaseAdmin.js';
import { createRoute, validateRouteData, RouteStatus } from '../models/route.js';

const router = express.Router();

const CONTROLLER_ROUTES_PATH = '/controller_routes';

/**
 * GET /api/controller/routes
 * Returns all Controller routes
 */
router.get('/routes', async (req, res) => {
  try {
    const db = getDatabase();
    const routesRef = db.ref(CONTROLLER_ROUTES_PATH);
    const snapshot = await routesRef.once('value');

    if (!snapshot.exists()) {
      return res.json({
        success: true,
        routes: []
      });
    }

    const routesData = snapshot.val();
    const routes = [];

    for (const [routeId, routeData] of Object.entries(routesData)) {
      routes.push({
        routeId,
        ...routeData
      });
    }

    res.json({
      success: true,
      routes
    });
  } catch (error) {
    console.error('Error fetching routes:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch routes',
      error: error.message
    });
  }
});

/**
 * GET /api/controller/routes/:routeId
 * Returns a specific route
 */
router.get('/routes/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const db = getDatabase();
    const routeRef = db.ref(`${CONTROLLER_ROUTES_PATH}/${routeId}`);
    const snapshot = await routeRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    const routeData = snapshot.val();

    res.json({
      success: true,
      route: {
        routeId,
        ...routeData
      }
    });
  } catch (error) {
    console.error('Error fetching route:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch route',
      error: error.message
    });
  }
});

/**
 * POST /api/controller/routes
 * Creates a new Controller route
 */
router.post('/routes', async (req, res) => {
  try {
    const { routeName, from, via, to } = req.body;

    // Validate input data
    const validation = validateRouteData({
      routeName,
      from,
      via,
      to
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid route data',
        errors: validation.errors
      });
    }

    const db = getDatabase();

    // Create route record
    const route = createRoute({
      routeName,
      from,
      via,
      to,
      status: RouteStatus.ACTIVE
    });

    // Store route in Firebase
    const routeRef = db.ref(`${CONTROLLER_ROUTES_PATH}/${route.routeId}`);
    await routeRef.set(route);

    res.status(201).json({
      success: true,
      route
    });
  } catch (error) {
    console.error('Error creating route:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create route',
      error: error.message
    });
  }
});

/**
 * PUT /api/controller/routes/:routeId
 * Updates an existing Controller route
 */
router.put('/routes/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const { routeName, from, via, to, status } = req.body;

    const db = getDatabase();
    const routeRef = db.ref(`${CONTROLLER_ROUTES_PATH}/${routeId}`);
    const snapshot = await routeRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    const existingRoute = snapshot.val();

    // Validate if updating route fields
    if (routeName || from || to) {
      const validation = validateRouteData({
        routeName: routeName || existingRoute.routeName,
        from: from || existingRoute.from,
        via: via !== undefined ? via : existingRoute.via,
        to: to || existingRoute.to
      });

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid route data',
          errors: validation.errors
        });
      }
    }

    // Validate status if provided
    if (status && !Object.values(RouteStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        error: 'Status must be one of: active, inactive'
      });
    }

    // Update route
    const updates = {
      updatedAt: Date.now()
    };

    if (routeName) updates.routeName = routeName;
    if (from) updates.from = from;
    if (via !== undefined) updates.via = via;
    if (to) updates.to = to;
    if (status) updates.status = status;

    await routeRef.update(updates);

    const updatedRoute = { ...existingRoute, ...updates };

    res.json({
      success: true,
      message: 'Route updated successfully',
      route: updatedRoute
    });
  } catch (error) {
    console.error('Error updating route:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update route',
      error: error.message
    });
  }
});

export default router;

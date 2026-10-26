/**
 * Authentication Middleware
 * Verifies that the user is authenticated via session
 */

export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  next();
}

/**
 * Attach authenticated user to request
 * This middleware should run after session middleware
 */
export async function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    // User data is already attached by auth routes
    // This middleware ensures it's available for all protected routes
    req.user = req.session.user;
  }
  next();
}

/**
 * Authorization middleware for depot access
 * Ensures the authenticated user can only access their own depot data
 */
export function requireDepotAccess(req, res, next) {
  if (!req.user || !req.user.depotId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  // The depot context is already set in req.user.depotId
  // Route handlers should use req.user.depotId for authorization
  // and ignore any depotId from req.body, req.query, or req.params
  next();
}

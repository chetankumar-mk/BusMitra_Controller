import express from 'express';
import ControllerUser from '../models/ControllerUser.js';
import { hashPassword, comparePassword } from '../helpers/password.js';
import { connectToMongoDB } from '../config/mongodb.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticate a Controller user
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Normalize username to lowercase for case-insensitive lookup
    const normalizedUsername = username.toLowerCase().trim();

    // Connect to MongoDB
    await connectToMongoDB();

    // Find user by username
    const user = await ControllerUser.findOne({ username: normalizedUsername });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Controller access is currently disabled'
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Set session data
    req.session.userId = user._id.toString();
    req.session.user = {
      username: user.username,
      depotId: user.depotId,
      depotName: user.depotName,
      role: user.role
    };

    // Return user data (without password hash)
    res.json({
      success: true,
      user: {
        username: user.username,
        depotId: user.depotId,
        depotName: user.depotName,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during login'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout the current user
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        error: 'An error occurred during logout'
      });
    }

    res.clearCookie('connect.sid');
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

/**
 * GET /api/auth/me
 * Get the current authenticated user
 */
router.get('/me', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Connect to MongoDB
    await connectToMongoDB();

    // Get user from session
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Return user data
    res.json({
      success: true,
      user: {
        username: user.username,
        depotId: user.depotId,
        depotName: user.depotName,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while fetching user data'
    });
  }
});

export default router;

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import { initializeFirebase, isFirebaseConfigured } from './config/firebaseAdmin.js';
import { connectToMongoDB } from './config/mongodb.js';
import healthRoutes from './routes/health.js';
import busRoutes from './routes/buses.js';
import driverRoutes from './routes/drivers.js';
import routeRoutes from './routes/routes.js';
import assignmentRoutes from './routes/assignments.js';
import integrationRoutes from './routes/integration.js';
import operationsRoutes from './routes/operations.js';
import trackingRoutes from './routes/tracking.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'busmitra-controller-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Firebase
try {
  initializeFirebase();
} catch (error) {
  console.error('Firebase initialization failed:', error.message);
  console.error('The server will start but Firebase-dependent endpoints will not work.');
}

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/controller', busRoutes);
app.use('/api/controller', driverRoutes);
app.use('/api/controller', routeRoutes);
app.use('/api/controller', assignmentRoutes);
app.use('/api/controller/operations', operationsRoutes);
app.use('/api/controller/tracking', trackingRoutes);
app.use('/api/integration', integrationRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'busmitra-controller-backend',
    version: '1.0.0',
    status: 'running'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`BusMitra Controller Backend running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
});

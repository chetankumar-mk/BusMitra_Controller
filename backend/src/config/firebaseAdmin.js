import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * This must be called exactly once during application startup
 */
export function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    const serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    // Check if we have environment variables configured
    if (serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://busmitra-64ebe-default-rtdb.asia-southeast1.firebasedatabase.app',
      });
      console.log(`Firebase Admin initialized for project: ${serviceAccount.project_id}`);
    } else {
      // Fallback: Try to use serviceAccountKey.json if it exists locally
      // This is for local development only
      const serviceAccountPath = path.join(__dirname, '../../../serviceAccountKey.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccountKey = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        const databaseURL = process.env.FIREBASE_DATABASE_URL || 'https://busmitra-64ebe-default-rtdb.asia-southeast1.firebasedatabase.app';
        
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccountKey),
          databaseURL: databaseURL,
        });
        console.log(`Using serviceAccountKey.json for Firebase Admin initialization`);
        console.log(`Firebase Admin initialized for project: ${serviceAccountKey.project_id}`);
        console.log(`Database URL: ${databaseURL}`);
      } else {
        throw new Error(
          'Firebase Admin credentials not configured. ' +
          'Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env, ' +
          'or place serviceAccountKey.json for busmitra-64ebe in the project root.'
        );
      }
    }
    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error.message);
    throw error;
  }
}

/**
 * Get the Firebase Admin app instance
 * @returns {admin.app.App}
 */
export function getFirebaseApp() {
  if (!firebaseApp) {
    throw new Error('Firebase Admin not initialized. Call initializeFirebase() first.');
  }
  return firebaseApp;
}

/**
 * Get the Firebase Realtime Database instance
 * @returns {admin.database.Database}
 */
export function getDatabase() {
  const app = getFirebaseApp();
  return admin.database(app);
}

/**
 * Get the Firebase Auth instance
 * @returns {admin.auth.Auth}
 */
export function getAuth() {
  const app = getFirebaseApp();
  return admin.auth(app);
}

/**
 * Check if Firebase is configured and accessible
 * @returns {Promise<boolean>}
 */
export async function isFirebaseConfigured() {
  try {
    const db = getDatabase();
    const ref = db.ref('.info/connected');
    await ref.once('value');
    return true;
  } catch (error) {
    console.error('Firebase configuration check failed:', error.message);
    return false;
  }
}

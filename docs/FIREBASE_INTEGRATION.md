# Firebase Integration Documentation

## Overview

This document describes the Firebase integration for the BusMitra Controller Web Application. The Controller connects to the existing BusMitra Firebase project to read and manage bus and driver data.

## Firebase Project Details

- **Project ID**: `busmitra-64ebe`
- **Realtime Database URL**: `https://busmitra-64ebe-default-rtdb.asia-southeast1.firebasedatabase.app`
- **Region**: asia-southeast1

## Architecture

The Controller follows a strict backend-for-frontend (BFF) architecture:

```
Controller React Frontend
         ↓
   REST API (HTTP)
         ↓
Controller Backend (Express)
         ↓
Firebase Admin SDK
         ↓
Existing BusMitra Firebase
```

**Critical Rules:**
- Frontend MUST NOT directly access Firebase
- Firebase Web SDK is NOT used in the frontend
- Firebase Admin SDK is used ONLY on the backend
- Firebase Admin credentials exist ONLY on the backend

## Existing Firebase Data Structure

### Buses

**Path**: `/buses`

**Bus ID Convention**: `bus_{busNumber}`

Examples:
- `bus_101`
- `bus_038`
- `bus_052`

**Bus Record Structure**:
```json
{
  "busNumber": "101",
  "from": "lxr",
  "via": "",
  "to": "hvr",
  "route": "lxr → hvr",
  "status": "inactive",
  "lat": null,
  "lng": null,
  "accuracy": null,
  "lastUpdated": null
}
```

**Important**: The bus ID convention MUST be preserved for compatibility with existing Driver and Passenger applications. Do not convert or rename these IDs.

### Crowd Observations

**Path**: `/crowd_observations`

This path contains crowd density observations from the Passenger application.

### Passenger Bus Alerts

**Path**: `/passenger_bus_alerts`

This path contains alerts and notifications for passengers.

### Passenger Sessions

**Path**: `/passenger_sessions`

This path contains active passenger sessions.

## Driver Authorization

### Existing Driver Authorization Mechanism

The existing Driver Android application uses Firebase Authentication custom claims:

**Custom Claims**:
```json
{
  "role": "driver",
  "busId": "bus_101"
}
```

**Driver App Verification**:
1. Driver app verifies `role === "driver"`
2. Driver app extracts `busId` from the ID token
3. Driver app uses the authorized `busId` when starting tracking

**Important**: This authorization mechanism MUST be preserved. Do not replace or modify it in this milestone.

### Driver Tracking Path

When a driver starts tracking, the Driver App writes to:

**Path**: `/buses/{busId}`

Example:
```
/buses/bus_101
```

The driver updates:
- `lat`: Current latitude
- `lng`: Current longitude
- `accuracy`: GPS accuracy
- `lastUpdated`: Timestamp
- `status`: "active" or "running"

## Controller Backend Firebase Configuration

### Firebase Admin SDK Initialization

The backend initializes Firebase Admin exactly once in `backend/src/config/firebaseAdmin.js`:

```javascript
import admin from 'firebase-admin';

// Initialize with environment variables or serviceAccountKey.json
const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});
```

### Configuration Methods

#### Method 1: Environment Variables (Recommended for Production)

Set in `backend/.env`:
```
FIREBASE_PROJECT_ID=busmitra-64ebe
FIREBASE_DATABASE_URL=https://busmitra-64ebe-default-rtdb.asia-southeast1.firebasedatabase.app
FIREBASE_CLIENT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

#### Method 2: Service Account Key File (Local Development)

Place `serviceAccountKey.json` in the project root. The backend will automatically detect and use it.

**Security**: Never commit `.env` or `serviceAccountKey.json` to version control.

## Backend API Endpoints

### Health Check

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "success": true,
  "service": "busmitra-controller-backend",
  "firebaseConfigured": true,
  "firebaseProjectId": "busmitra-64ebe"
}
```

### Get All Buses

**Endpoint**: `GET /api/controller/buses`

**Reads from**: `/buses` in Firebase Realtime Database

**Response**:
```json
{
  "success": true,
  "buses": [
    {
      "busId": "bus_101",
      "busNumber": "101",
      "from": "lxr",
      "via": "",
      "to": "hvr",
      "route": "lxr → hvr",
      "status": "inactive",
      "lat": null,
      "lng": null,
      "accuracy": null,
      "lastUpdated": null
    }
  ]
}
```

### Get Specific Bus

**Endpoint**: `GET /api/controller/buses/:busId`

**Example**: `GET /api/controller/buses/bus_101`

**Reads from**: `/buses/{busId}` in Firebase Realtime Database

**Response**:
```json
{
  "success": true,
  "bus": {
    "busId": "bus_101",
    "busNumber": "101",
    "from": "lxr",
    "via": "",
    "to": "hvr",
    "route": "lxr → hvr",
    "status": "inactive",
    "lat": null,
    "lng": null,
    "accuracy": null,
    "lastUpdated": null
  }
}
```

**Error (404)**:
```json
{
  "success": false,
  "message": "Bus not found"
}
```

### Get All Drivers

**Endpoint**: `GET /api/controller/drivers`

**Uses**: Firebase Admin Authentication `listUsers()`

**Filters**: Only users with `role === "driver"` custom claim

**Response**:
```json
{
  "success": true,
  "drivers": [
    {
      "firebaseUid": "abc123...",
      "driverAccountId": "abc123...",  // Fallback: Firebase UID
      "role": "driver",
      "busId": "bus_101",
      "deviceId": null,  // Not yet available
      "displayName": "John Driver",
      "email": "driver@example.com",
      "phoneNumber": null,
      "disabled": false
    }
  ]
}
```

**Important Notes**:
- `driverAccountId` currently uses Firebase UID as a fallback
- `deviceId` is `null` because device registration is not yet integrated
- This endpoint does NOT modify Firebase custom claims in this milestone

## Device ID Limitation

### Current State

The current Driver App architecture does not yet provide a confirmed permanent registered device ID in the Firebase structure.

### Implementation in This Milestone

- `deviceId` is set to `null` for all drivers
- The Assign Bus page displays "Not registered" for device ID
- No fake device IDs are created

### Future Integration

Registered device identity will be integrated in a future Driver App integration milestone. The final Controller will support:

```
Driver Account ID
+
Registered Device ID
+
Bus
+
Route
+
Trip
```

## Controller Authority

### Final System Rule

**THE CONTROLLER HAS FINAL AUTHORITY OVER BUS ASSIGNMENT.**

The Controller will eventually assign:
- Driver Account
- Driver Firebase UID
- Registered Device ID
- Bus
- Route
- Trip

### Driver Restrictions

- The Driver cannot choose another bus
- The Driver cannot override the Controller's assignment
- The Driver only starts the assigned trip

### Current Milestone Limitation

Do NOT implement the complete assignment flow in this milestone. This milestone only:
- Reads existing bus data from Firebase
- Reads existing driver custom claims from Firebase
- Displays the data in the UI
- Creates the UI foundation for assignment (without submission)

## What Will Be Implemented Next

### Next Integration Milestone

1. **Controller Authentication**
   - Login system for Controller operators
   - Role-based access control
   - Session management

2. **Assignment Engine**
   - Backend API to create assignments
   - Controller authority over bus assignments
   - Modification of driver custom claims through Controller
   - Assignment validation and conflict resolution

3. **Device Registration**
   - Integration with Driver App for device ID registration
   - Device validation and authorization
   - Device-to-driver binding

4. **Route Management**
   - Route configuration in Firebase
   - Route-to-bus mapping
   - Schedule management

5. **Live Monitoring**
   - WebSocket connection for real-time updates
   - Live map view of all buses
   - Real-time crowd density display

6. **Emergency Features**
   - SOS alert handling
   - Emergency response coordination
   - Incident logging

## Compatibility Rules

### Must Preserve

1. **Bus ID Convention**: `bus_{busNumber}` (e.g., `bus_101`)
2. **Driver Custom Claims**: `role` and `busId`
3. **Bus Fields**: `busNumber`, `from`, `via`, `to`, `route`, `status`, `lat`, `lng`, `accuracy`, `lastUpdated`
4. **Driver Tracking Path**: `/buses/{busId}`

### Must NOT Do

1. Do NOT rename bus IDs in Firebase
2. Do NOT modify existing driver custom claims
3. Do NOT create a second competing bus authorization system
4. Do NOT remove the existing role/busId claim mechanism
4. Do NOT use Firebase Web SDK in the frontend
5. Do NOT expose Firebase Admin credentials to the browser

## Security Considerations

### Backend Security

- Firebase Admin credentials are server-side only
- Never expose private keys in logs
- Use environment variables for sensitive configuration
- `.env` and `serviceAccountKey.json` are in `.gitignore`

### Frontend Security

- No direct Firebase access
- All data flows through backend API
- No Firebase Web SDK imports
- No service account keys in frontend code

### Development Mode

- Authentication is intentionally deferred to a later milestone
- This is a development-only stage
- Do not expose this development server publicly
- Document that authentication is coming in next milestone

## Testing Firebase Connection

### Test Backend Health

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "success": true,
  "service": "busmitra-controller-backend",
  "firebaseConfigured": true,
  "firebaseProjectId": "busmitra-64ebe"
}
```

### Test Buses Endpoint

```bash
curl http://localhost:3001/api/controller/buses
```

### Test Drivers Endpoint

```bash
curl http://localhost:3001/api/controller/drivers
```

## Troubleshooting

### Firebase Connection Fails

1. Verify Firebase project ID is correct: `busmitra-64ebe`
2. Verify database URL is correct
3. Check that service account has proper permissions
4. Ensure private key is properly formatted with `\n` for line breaks
5. Check Firebase Console for any project restrictions

### No Buses Returned

1. Check Firebase Realtime Database at `/buses`
2. Verify the path exists and contains data
3. Check Firebase Admin SDK permissions
4. Review backend logs for errors

### No Drivers Returned

1. Check Firebase Authentication for users with custom claims
2. Verify users have `role: "driver"` custom claim
3. Check Firebase Admin SDK permissions for Auth
4. Review backend logs for errors

### Bus ID Not Found

1. Verify the bus ID follows the convention `bus_{busNumber}`
2. Check that the bus exists in Firebase at `/buses/{busId}`
3. Ensure the bus ID is not modified or converted

## Integration with Existing Apps

### Driver Android App

- The Driver App continues to use existing authorization mechanism
- The Driver App writes to `/buses/{busId}` when tracking
- The Controller reads this data for monitoring
- Future: Controller will modify driver custom claims for assignment

### Passenger Android App

- The Passenger App reads from `/buses` for bus locations
- The Passenger App writes to `/crowd_observations`
- The Controller will read this data for monitoring
- No changes to Passenger App in this milestone

## Summary

This milestone establishes the foundation for the Controller to become the primary operator of the BusMitra system:

✅ Backend connects to existing Firebase project
✅ Backend reads real bus data from Firebase
✅ Backend reads real driver accounts from Firebase
✅ Frontend displays real data via API
✅ No Firebase access in frontend
✅ Preserves existing bus ID convention
✅ Preserves existing driver authorization
✅ No fake data used
✅ Assignment UI foundation created (without submission)

The next milestone will add authentication, assignment engine, device registration, and live monitoring capabilities.

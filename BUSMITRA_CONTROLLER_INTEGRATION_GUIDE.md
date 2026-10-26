# BusMitra Controller Integration Guide

## Overview

This guide documents the BusMitra Controller integration architecture and endpoints for future Driver App integration.

## Architecture

```
React Controller Frontend
    ↓
Express Backend API
    ↓
Firebase Admin SDK
    ↓
Firebase Realtime Database
```

### Key Principles

- **Controller owns assignments**: The Controller is the authoritative source for driver-to-bus assignments.
- **Driver does not select bus**: Drivers receive assignments from the Controller, they do not create trips.
- **Read-only integration**: Integration endpoints are read-only and do not modify Firebase data.
- **Firebase Admin only**: Firebase access is restricted to the backend using Firebase Admin SDK.
- **No direct Firebase in React**: The React frontend communicates only through the Controller backend API.

## Data Structures

### 1. Controller Driver Registry

**Path:** `/controller_drivers/{driverId}`

**Example:**
```json
{
  "driverId": "DRV001",
  "driverName": "Driver Name",
  "registeredDeviceId": "DEV001",
  "firebaseUid": null,
  "status": "REGISTERED",
  "createdAt": 1790224678507,
  "updatedAt": 1790224678507
}
```

**Fields:**
- `driverId`: Controller-assigned driver identifier (e.g., DRV001)
- `driverName`: Human-readable driver name
- `registeredDeviceId`: Device identifier registered to the driver
- `firebaseUid`: Firebase Authentication UID (null until linked)
- `status`: Driver registration status (REGISTERED, ACTIVE, etc.)
- `createdAt`: Registration timestamp
- `updatedAt`: Last update timestamp

### 2. Controller Assignments

**Path:** `/controller_assignments/{assignmentId}`

**Example:**
```json
{
  "assignmentId": "assignment_1790227383691_81p58r",
  "driverId": "DRV001",
  "driverUid": null,
  "driverName": "Rahul",
  "busNumber": "101",
  "busId": "bus_101",
  "from": "Lakshmeshwar",
  "via": "Gadag",
  "to": "Haveri",
  "scheduledDate": "2026-09-24",
  "scheduledDepartureTime": "09:00",
  "status": "ASSIGNED",
  "createdAt": 1790227383691,
  "updatedAt": 1790227383691
}
```

**Fields:**
- `assignmentId`: Unique assignment identifier
- `driverId`: Controller driver ID
- `driverUid`: Firebase UID (null if not linked)
- `driverName`: Driver name
- `busNumber`: Bus number entered by Controller (e.g., 101)
- `busId`: Internal bus ID derived from bus number (e.g., bus_101)
- `from`: Trip origin
- `via`: Intermediate stop (optional)
- `to`: Trip destination
- `scheduledDate`: Scheduled date (YYYY-MM-DD)
- `scheduledDepartureTime`: Scheduled departure time (HH:mm)
- `status`: Assignment status (ASSIGNED, CANCELLED, COMPLETED)
- `createdAt`: Assignment creation timestamp
- `updatedAt`: Last update timestamp

## Bus ID Convention

The Controller operator enters only the **Bus Number**. The backend automatically derives the internal **busId**.

**Conversion Rules:**
- `101` → `bus_101`
- `038` → `bus_038` (leading zeros preserved)
- `52` → `bus_052`

**Important:**
- Never ask the Controller operator to manually enter `busId`
- The UI field is specifically "Bus Number"
- Backend handles the conversion automatically

## Integration Endpoints

### 1. Get Driver Assignment by Controller ID

**Endpoint:** `GET /api/integration/driver/:driverId/assignment`

**Purpose:** Retrieve driver information and current assignment using Controller driver ID.

**Request:**
```
GET /api/integration/driver/DRV001/assignment
```

**Success Response (with assignment):**
```json
{
  "success": true,
  "driver": {
    "driverId": "DRV001",
    "driverName": "Driver Name",
    "registeredDeviceId": "DEV001",
    "firebaseUid": null
  },
  "assignment": {
    "assignmentId": "assignment_1790227383691_81p58r",
    "busNumber": "101",
    "busId": "bus_101",
    "from": "Lakshmeshwar",
    "via": "Gadag",
    "to": "Haveri",
    "scheduledDate": "2026-09-24",
    "scheduledDepartureTime": "09:00",
    "status": "ASSIGNED"
  }
}
```

**Success Response (without assignment):**
```json
{
  "success": true,
  "driver": {
    "driverId": "DRV001",
    "driverName": "Driver Name",
    "registeredDeviceId": "DEV001",
    "firebaseUid": null
  },
  "assignment": null
}
```

**Error Response (driver not found):**
```json
{
  "success": false,
  "error": "Driver with ID UNKNOWN not found in Controller registry"
}
```

**Behavior:**
- Finds driver in `/controller_drivers/{driverId}`
- Returns HTTP 404 if driver does not exist
- Finds driver's active/latest assignment from `/controller_assignments`
- Prefers assignments with status "ASSIGNED"
- Returns most recent assignment if multiple exist
- Does not modify Firebase data
- Does not modify custom claims
- Does not touch `/buses`

### 2. Get Driver Assignment by Firebase UID

**Endpoint:** `GET /api/integration/firebase-driver/:firebaseUid/assignment`

**Purpose:** Retrieve driver information and assignment using Firebase UID (for linked drivers).

**Request:**
```
GET /api/integration/firebase-driver/abc123xyz789/assignment
```

**Success Response:** Same structure as endpoint 1

**Error Response (not linked):**
```json
{
  "success": false,
  "error": "Driver Firebase UID is not linked to Controller"
}
```

**Behavior:**
- Searches `/controller_drivers` for driver with matching `firebaseUid`
- Returns HTTP 404 if no linked driver exists
- Returns same driver + assignment structure as endpoint 1
- Read-only endpoint
- Does not automatically create a driver
- Does not automatically link the UID
- Does not change claims
- Does not modify `/buses`

**Security Note:**
This endpoint is for integration readiness testing only. In production, the Driver App should authenticate using a Firebase ID token, and the backend should verify that token with Firebase Admin SDK before returning assignment data.

**TODO:** Implement Firebase ID token verification for secure Driver App integration.

### 3. Integration Status

**Endpoint:** `GET /api/integration/status`

**Purpose:** Returns integration service status and statistics.

**Request:**
```
GET /api/integration/status
```

**Success Response:**
```json
{
  "success": true,
  "service": "busmitra-controller-integration",
  "firebase": "connected",
  "assignmentApi": true,
  "timestamp": 1790227383691,
  "statistics": {
    "totalDrivers": 10,
    "linkedDrivers": 5,
    "totalAssignments": 8,
    "assignedDrivers": 6,
    "unassignedDrivers": 4
  }
}
```

**Behavior:**
- Checks Firebase connectivity
- Counts registered drivers
- Counts drivers linked to Firebase UID
- Counts total assignments
- Counts drivers with active assignments
- Does not expose credentials or secrets

## Driver App Integration Requirements

### Current State

- Driver App uses Firebase Authentication
- Driver App currently uses Firebase custom claims for bus assignments
- Controller backend can update Firebase custom claims when driver is linked

### Future Integration Steps

1. **Firebase Authentication**
   - Driver App authenticates with Firebase
   - Driver receives Firebase ID token

2. **Token Verification**
   - Driver App sends Firebase ID token to Controller backend
   - Backend verifies token with Firebase Admin SDK
   - Backend extracts Firebase UID from verified token

3. **UID Resolution**
   - Backend searches `/controller_drivers` for matching `firebaseUid`
   - If found, resolves to Controller `driverId`
   - If not found, returns "not linked" error

4. **Device Verification**
   - Backend verifies `registeredDeviceId` matches Driver App device
   - Prevents unauthorized device access

5. **Assignment Retrieval**
   - Backend fetches driver's current assignment
   - Returns bus number, route, schedule to Driver App
   - Driver App displays assignment to driver

6. **Start Tracking Validation**
   - Driver App validates assignment exists before allowing tracking
   - Driver App checks scheduled date/time
   - Only allows tracking for valid, active assignments

7. **Custom Claim Refresh**
   - When Controller changes bus assignment
   - Backend updates Firebase custom claim `busId`
   - Driver App should refresh claims on next login
   - Driver App receives updated bus assignment

## Important Notes

### Controller Authority

- Controller owns all assignment data
- Driver does not select the bus
- Driver does not create the trip
- Driver should only start tracking after receiving a valid assignment from Controller

### Firebase Custom Claims

- Custom claims are updated only when driver is linked to Firebase UID
- Existing custom claims are preserved
- Only `busId` is changed by assignment operation
- No new Firebase Auth users are created
- No unrelated claims are deleted or overwritten

### Data Separation

- `/controller_drivers` - Controller driver registry
- `/controller_assignments` - Controller assignments
- `/buses` - Operational tracking data (Driver system)
- Controller assignments do NOT require `/buses/{busId}` to exist
- `/buses` is not modified during assignment creation

### Security Considerations

- Firebase Admin SDK is only used in the backend
- React frontend has no direct Firebase access
- Service account credentials are never exposed to the frontend
- Integration endpoints are read-only
- Production implementation requires Firebase ID token verification

## Milestone Scope

This milestone (Milestone 3) includes:

- Backend integration endpoints for Driver App
- Driver Integration status page in Controller UI
- Integration documentation

This milestone does NOT include:

- Firebase ID token verification (TODO for future)
- Driver App modifications
- Passenger App modifications
- Existing backend modifications outside Controller project
- Automatic Firebase UID linking
- Real-time assignment updates to Driver App

## Testing

### Test Cases

1. **Existing registered driver:**
   ```
   GET /api/integration/driver/DRV001/assignment
   Expected: Success with driver and assignment data
   ```

2. **Unknown driver:**
   ```
   GET /api/integration/driver/UNKNOWN/assignment
   Expected: HTTP 404 with error message
   ```

3. **Driver with no assignment:**
   ```
   GET /api/integration/driver/DRV002/assignment
   Expected: Success with driver data, assignment: null
   ```

4. **Firebase UID not linked:**
   ```
   GET /api/integration/firebase-driver/unlinked-uid/assignment
   Expected: HTTP 404 with "not linked" error
   ```

5. **Integration status:**
   ```
   GET /api/integration/status
   Expected: Success with service status and statistics
   ```

6. **React Firebase SDK check:**
   - Verify no Firebase SDK imports in React code
   - Verify all Firebase access goes through backend API

7. **Credential exposure check:**
   - Verify no service-account key in frontend code
   - Verify no Firebase credentials in React bundle

8. **Data integrity check:**
   - Verify `/buses` is not modified
   - Verify no changes to Driver/Passenger Android projects

## Contact

For questions about Controller integration, refer to the project documentation or contact the development team.

## Milestone 4: Firebase UID Linking and Custom Claim Authority

### Controller Driver ID vs Firebase UID

**Controller Driver ID:**
- Business identifier such as DRV001
- Assigned by Controller operator
- Used for Controller-side management
- Stored in `/controller_drivers/{driverId}`

**Registered Device ID:**
- Controller-managed device identifier such as DEV001
- Links driver to physical device
- Used for device validation

**Firebase UID:**
- Technical Firebase Authentication identifier
- Generated by Firebase when user is created
- Links Controller driver to Firebase Auth user
- Required for Firebase custom claim updates

**busId:**
- Existing operational identifier such as bus_101
- Derived from Bus Number (101 → bus_101)
- Used in Firebase custom claims for Driver App
- Internal compatibility value

### Firebase UID Linking

**Endpoint:** `POST /api/controller/drivers/:driverId/link-firebase`

**Purpose:** Links a Firebase UID to a Controller driver record.

**Request:**
```json
{
  "firebaseUid": "REAL_FIREBASE_UID"
}
```

**Behavior:**
1. Finds Controller driver in `/controller_drivers/{driverId}`
2. Validates Firebase UID is present and non-empty
3. Verifies Firebase user exists using Firebase Admin SDK
4. Checks if Firebase UID is already linked to another Controller driver
5. If valid and available, updates `/controller_drivers/{driverId}/firebaseUid`
6. If driver has existing assignment, updates Firebase custom claim busId
7. Preserves all other Firebase custom claims

**Success Response:**
```json
{
  "success": true,
  "message": "Firebase UID linked successfully",
  "driver": {
    "driverId": "DRV001",
    "driverName": "...",
    "registeredDeviceId": "DEV001",
    "firebaseUid": "..."
  },
  "firebaseLinked": true,
  "claimUpdated": true,
  "claimBusId": "bus_101"
}
```

**Error Responses:**
- HTTP 404: Driver not found
- HTTP 400: Invalid Firebase UID or Firebase user not found
- HTTP 409: Firebase UID already linked to another driver

### Firebase Custom Claim Authority

**Assignment Authority:**
- Controller is the authoritative source for driver-to-bus assignments
- When Controller creates/changes assignment for linked driver:
  - Backend reads linked Firebase UID
  - Backend reads existing Firebase custom claims
  - Backend preserves all claims (role, etc.)
  - Backend changes ONLY busId to newly assigned busId

**Example Reassignment:**
```
Before: DRV001 with firebaseUid = ABC123, assigned to bus_101
Firebase claims: { "role": "driver", "busId": "bus_101" }

Controller assigns: bus_205

After: Firebase claims: { "role": "driver", "busId": "bus_205" }
```

**Unassignment:**
- When driver has no active assignment:
  - Backend removes ONLY busId claim
  - Preserves role and all other claims

**Example Unassignment:**
```
Before: Firebase claims: { "role": "driver", "busId": "bus_101" }

After unassignment: Firebase claims: { "role": "driver" }
```

### Integration Status Endpoint

**Endpoint:** `GET /api/controller/drivers/:driverId/integration-status`

**Purpose:** Returns integration status for a specific driver.

**Response:**
```json
{
  "success": true,
  "driverId": "DRV001",
  "firebaseLinked": true,
  "firebaseUid": "...",
  "hasAssignment": true,
  "busId": "bus_101",
  "claimBusId": "bus_101",
  "claimSynchronized": true
}
```

### Assignment Status Update

**Endpoint:** `PUT /api/controller/assignments/:assignmentId/status`

**Purpose:** Updates assignment status and handles Firebase claims.

**Request:**
```json
{
  "status": "UNASSIGNED"
}
```

**Behavior:**
- Updates assignment status in `/controller_assignments`
- If status is UNASSIGNED and driver is linked:
  - Removes busId from Firebase custom claims
  - Preserves role and all other claims

### Firebase Claim Safety Helpers

The backend uses reusable helper functions for safe Firebase claim manipulation:

**updateDriverBusClaim(firebaseUid, busId):**
- Reads existing Firebase custom claims
- Preserves all unrelated claims
- Updates only busId
- Never replaces complete claims object

**removeDriverBusClaim(firebaseUid):**
- Reads existing Firebase custom claims
- Removes only busId
- Preserves role and all other claims
- Never replaces complete claims object

### Security Considerations

**IMPORTANT:**
- Controller authentication and authorization must be implemented before exposing Firebase UID linking and custom-claim mutation APIs in production
- Current implementation does not have Controller login/authentication
- These APIs are for development/testing only
- Do not expose these APIs publicly without proper authentication

### Controller UI Updates

**Driver Management Page:**
- Shows Firebase UID link status for each driver
- Provides "Link Firebase" action for unlinked drivers
- Displays success/error messages for linking operations
- Prevents accidental linking of same Firebase UID to multiple drivers

**Assignments Page:**
- Shows Firebase Link status (Linked/Not Linked)
- Shows Claim Status (Synced/Not Synced/N/A)
- Displays Bus ID alongside Bus Number
- Shows assignment status including UNASSIGNED

### Key Principles

1. **Existing claims are preserved:** Role and other claims are never modified
2. **Only busId changes:** Controller assignment only affects busId claim
3. **Controller is authoritative:** Driver cannot override Controller assignment
4. **No Firebase user creation:** Controller never creates Firebase users
5. **No Firebase user deletion:** Controller never deletes Firebase users
6. **No /buses modification:** Controller does not modify operational tracking data

### This Milestone Does NOT Modify

- Driver Android project
- Passenger Android project
- Existing Driver backend
- /buses operational tracking data
- Firebase user creation/deletion

## Milestone 5: Operations Dashboard

### Operations Dashboard Data Flow

```
/controller_drivers (Controller driver registry)
        +
/controller_assignments (Controller assignments)
        +
/buses (Operational tracking data)
        ↓
Controller Backend (operations.js)
        ↓
Operations API (/api/controller/operations/*)
        ↓
React Dashboard (Dashboard.jsx)
```

### Data Separation Principle

The dashboard maintains strict separation between:

**Controller Assignment Data:**
- Source: `/controller_drivers` and `/controller_assignments`
- Purpose: Driver-to-bus assignments managed by Controller
- Authoritative: Controller is the source of truth

**Operational Tracking Data:**
- Source: `/buses`
- Purpose: Real-time GPS tracking and bus status
- Read-only: Dashboard does not modify this data

The backend combines these data sources for presentation, but they remain separate in Firebase.

### Online/Offline Threshold

**Configuration:** `BUS_ONLINE_THRESHOLD_SECONDS = 30`

A bus is considered **ONLINE** if its `lastUpdated` timestamp is within 30 seconds of the current time.

A bus is considered **OFFLINE** if its `lastUpdated` timestamp is older than 30 seconds.

This threshold is defined in `backend/src/config/operationsConfig.js` and used consistently throughout the operations API.

### Operations API Endpoints

**GET /api/controller/operations/summary**

Returns operational summary statistics:
- `registeredDrivers`: Total Controller drivers
- `firebaseLinkedDrivers`: Drivers with Firebase UID linked
- `activeAssignments`: Currently active assignments
- `unassignedDrivers`: Drivers without active assignment
- `trackedBuses`: Total buses in /buses
- `onlineBuses`: Buses with recent GPS update
- `offlineBuses`: Buses without recent GPS update

**GET /api/controller/operations/fleet**

Returns combined fleet data for each bus:
- Bus information (busId, busNumber)
- Driver information (if assigned)
- Assignment information (if assigned)
- Tracking information (status, location, lastUpdated, route, speed, trackingSource)
- Online/offline status (calculated)

### Firebase Fields Used

**From /buses:**
- `busId`: Bus identifier
- `busNumber`: Display bus number
- `status`: Tracking status (active/inactive)
- `lat`: Latitude (may be null)
- `lng`: Longitude (may be null)
- `accuracy`: GPS accuracy in meters
- `lastUpdated`: Timestamp of last GPS update
- `route`: Route string
- `speed`: Speed in km/h (may be null)
- `trackingSource` or `source`: Tracking source (if available)

**From /controller_drivers:**
- `driverId`: Controller driver ID
- `driverName`: Driver name
- `registeredDeviceId`: Device ID
- `firebaseUid`: Firebase UID (for linking status)

**From /controller_assignments:**
- `assignmentId`: Assignment identifier
- `driverId`: Assigned driver
- `busId`: Assigned bus
- `from`: Origin
- `via`: Via point
- `to`: Destination
- `scheduledDate`: Scheduled date
- `scheduledDepartureTime`: Scheduled departure time
- `status`: Assignment status (ASSIGNED, CANCELLED, COMPLETED, UNASSIGNED)

### Fields Currently Unavailable

The following fields are intentionally shown as null or "Unknown" because they are not present in the current Firebase schema:
- `speed`: Not consistently populated in /buses
- `trackingSource`: Not consistently populated in /buses (shown as "Unknown")
- Latitude/longitude: May be null if GPS data unavailable

### Dashboard Features

**KPI Cards:**
- Registered Drivers
- Firebase Linked Drivers
- Active Assignments
- Tracked Buses
- Online Buses
- Offline Buses
- Unassigned Drivers

**Fleet Status Table:**
- Bus number
- Driver (ID and name)
- Route
- Tracking status (ONLINE/OFFLINE)
- Location (latitude, longitude)
- Last update time
- Assignment status (ASSIGNED/UNASSIGNED)
- Bus status (ACTIVE/INACTIVE)

**Bus Detail Panel:**
- Bus information (number, ID)
- Driver information (ID, name, device ID, Firebase link status)
- Assignment information (from, via, to, date, departure time, status)
- Tracking information (status, coordinates, accuracy, last update, route, speed, tracking source, online status)

**Auto-Refresh:**
- Dashboard refreshes every 10 seconds
- Timer is cleaned up on component unmount
- No Firebase listeners used in React

### Dashboard Does Not Modify Operational Bus Data

The dashboard is read-only for operational tracking data:
- No writes to /buses
- No modifications to GPS coordinates
- No changes to tracking status
- All data flows from Firebase → Backend → React

### Security Considerations

**IMPORTANT:**
- Controller authentication and authorization must be implemented before exposing operations APIs in production
- Current implementation does not have Controller login/authentication
- These APIs are for development/testing only
- No Firebase credentials are exposed to the frontend
- Firebase Admin SDK remains backend-only

## Milestone 6: Operational State Model

### Operational State Model

The Controller backend now provides a normalized operational state layer that interprets raw Firebase data into consistent state values. This ensures the React UI does not contain business logic for determining operational state.

### State Definitions

**BUS STATE**
- **ONLINE**: Bus has GPS update within the last 30 seconds
- **OFFLINE**: Bus has no GPS update within the last 30 seconds
- Note: OFFLINE does not mean the driver stopped tracking - it means data is stale

**TRACKING STATE**
- **ACTIVE**: Bus status is "active" in /buses
- **INACTIVE**: Bus status is "inactive" in /buses
- **UNKNOWN**: Status is missing or unrecognized
- Note: ACTIVE/INACTIVE is an operational tracking status, separate from ONLINE/OFFLINE connectivity

**TRACKING SOURCE**
- **LIVE**: Live GPS tracking
- **GHAT_RADIO**: Ghat radio tracking
- **COMMUNITY_VERIFIED**: Community-verified data
- **AI_PREDICTED**: AI-predicted location
- **LAST_KNOWN**: Last known position
- **UNKNOWN**: Source field missing or unrecognized
- Important: UNKNOWN source must not be presented as LIVE

**ASSIGNMENT STATE**
- **ASSIGNED**: Bus has an active Controller assignment (status: ASSIGNED)
- **UNASSIGNED**: Bus has no active Controller assignment

**DRIVER STATE**
- **LINKED**: Driver has Firebase UID linked
- **NOT_LINKED**: Driver has no Firebase UID
- **UNKNOWN**: Driver record unavailable

**LOCATION STATE**
- **AVAILABLE**: Valid latitude and longitude exist
- **UNAVAILABLE**: Latitude or longitude is missing
- Important: Missing GPS must not be replaced with fake coordinates

### Operational State API

**GET /api/controller/operations/bus/:busId**

Returns detailed operational information for a specific bus, including the normalized operational state.

**Response Structure:**
```json
{
  "success": true,
  "bus": { "busId": "...", "busNumber": "..." },
  "driver": { "driverId": "...", "driverName": "...", "registeredDeviceId": "...", "firebaseLinked": true },
  "assignment": { "assignmentId": "...", "from": "...", "via": "...", "to": "...", "scheduledDate": "...", "scheduledDepartureTime": "...", "status": "..." },
  "tracking": { "status": "...", "latitude": ..., "longitude": ..., "accuracy": ..., "speed": ..., "lastUpdated": ..., "trackingSource": "..." },
  "operationalState": {
    "busState": "ONLINE|OFFLINE",
    "trackingState": "ACTIVE|INACTIVE|UNKNOWN",
    "trackingSource": "LIVE|GHAT_RADIO|COMMUNITY_VERIFIED|AI_PREDICTED|LAST_KNOWN|UNKNOWN",
    "assignmentState": "ASSIGNED|UNASSIGNED",
    "driverState": "LINKED|NOT_LINKED|UNKNOWN",
    "locationState": "AVAILABLE|UNAVAILABLE"
  }
}
```

### Updated APIs

**GET /api/controller/operations/fleet**

Now includes `operationalState` for each bus in the response.

**GET /api/controller/operations/summary**

Now includes additional summary fields:
- `activeTrackingBuses`: Buses with status "active"
- `assignedBuses`: Buses with active assignments
- `unassignedBuses`: Buses without active assignments
- `linkedDrivers`: Drivers with Firebase UID
- `unlinkedDrivers`: Drivers without Firebase UID

### Dashboard Updates

The Bus Detail panel now displays:

**BUS**
- Bus Number
- Bus ID
- Bus State (from operationalState)

**DRIVER**
- Driver ID
- Driver Name
- Registered Device ID
- Firebase Link Status

**ASSIGNMENT**
- Assignment ID
- From
- Via
- To
- Date
- Scheduled Departure
- Assignment Status

**TRACKING**
- Tracking Status
- Tracking Source
- Location State
- Latitude
- Longitude
- Accuracy
- Speed
- Last Updated
- Route

**OPERATIONAL STATE**
- Bus State
- Tracking State
- Tracking Source
- Assignment State
- Driver State
- Location State

### Key Principles

1. **OFFLINE ≠ Driver Stopped Tracking**: OFFLINE means data freshness is stale, not that the driver stopped tracking
2. **UNKNOWN ≠ LIVE**: UNKNOWN tracking source must not be presented as LIVE tracking
3. **Missing GPS ≠ Fake Coordinates**: Missing GPS data must show as UNAVAILABLE, not fabricated coordinates
4. **Data Separation**: Controller assignment data and operational tracking data remain separate in Firebase
5. **Backend State Logic**: All operational state derivation happens in the backend, not in React

### Backend Helper

The operational state logic is centralized in `backend/src/helpers/operationalState.js`:
- `isBusOnline()`: Determines online/offline based on lastUpdated
- `normalizeTrackingSource()`: Normalizes tracking source values
- `normalizeTrackingState()`: Normalizes tracking status
- `deriveDriverState()`: Derives driver state from Firebase UID
- `deriveAssignmentState()`: Derives assignment state
- `deriveLocationState()`: Derives location state from GPS coordinates
- `deriveOperationalState()`: Combines all state derivations

## Milestone 7: Live Tracking Data Contract

### Live Tracking Data Contract

The Controller backend now provides a dedicated tracking API for the existing Driver App's operational tracking data. The Controller remains read-only for /buses data.

### Firebase Path

**Path:** `/buses/{busId}`

**Bus ID Convention:**
- Existing Driver App uses: `bus_101`, `bus_038`, `bus_052`, etc.
- Controller preserves this exact convention
- Controller busNumber `101` maps to Firebase `bus_101`
- Leading zeros are preserved (e.g., `038` → `bus_038`)

### Tracking Fields Actually Used

**From /buses:**
- `busId`: Bus identifier (Firebase key)
- `busNumber`: Display bus number
- `status`: Tracking status (active/inactive)
- `lat`: Latitude (may be null)
- `lng`: Longitude (may be null)
- `accuracy`: GPS accuracy in meters
- `lastUpdated`: Timestamp of last GPS update
- `route`: Route string
- `speed`: Speed in km/h (may be null)
- `trackingSource` or `source`: Tracking source (if available)

### Freshness States

**FRESH:** lastUpdated is valid and within 30 seconds
**STALE:** lastUpdated exists but is older than 30 seconds
**UNKNOWN:** lastUpdated is missing or invalid

Uses existing `BUS_ONLINE_THRESHOLD_SECONDS = 30` configuration.

### Location States

**AVAILABLE:** Valid latitude and longitude exist (within valid ranges)
**UNAVAILABLE:** Latitude or longitude is missing or invalid

GPS Validation:
- Valid latitude: -90 to 90
- Valid longitude: -180 to 180

### Tracking Source States

**LIVE:** Live GPS tracking
**GHAT_RADIO:** Ghat radio tracking
**COMMUNITY_VERIFIED:** Community-verified data
**AI_PREDICTED:** AI-predicted location
**LAST_KNOWN:** Last known position
**UNKNOWN:** Source field missing or unrecognized

Important: UNKNOWN source is not presented as LIVE.

### State Distinctions

**Bus State vs Tracking Status vs Freshness:**

- **Bus State (ONLINE/OFFLINE):** Data freshness based on lastUpdated threshold
- **Tracking Status (ACTIVE/INACTIVE):** Operational tracking status from /buses
- **Freshness (FRESH/STALE/UNKNOWN):** Age of the GPS update

These are independent concepts:
- A bus can be: tracking status = ACTIVE, freshness = STALE, bus state = OFFLINE
- This means the Driver App last reported ACTIVE but the report is old
- A bus can be: tracking status = INACTIVE, freshness = FRESH
- This means the Driver App recently reported INACTIVE

### Tracking API

**GET /api/controller/tracking/bus/:busId**

Returns current operational tracking data for a specific bus.

**Response Structure:**
```json
{
  "success": true,
  "busId": "bus_101",
  "tracking": {
    "busNumber": "101",
    "status": "active",
    "latitude": null,
    "longitude": null,
    "accuracy": null,
    "speed": null,
    "route": null,
    "trackingSource": "UNKNOWN",
    "lastUpdated": null
  },
  "freshness": {
    "state": "FRESH|STALE|UNKNOWN",
    "ageSeconds": 10
  },
  "location": {
    "state": "AVAILABLE|UNAVAILABLE"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Bus tracking record not found"
}
```

### Updated APIs

**GET /api/controller/operations/fleet**

Now includes `freshness` and `location` for each bus.

**GET /api/controller/operations/bus/:busId**

Now includes `freshness` and `location` in the response.

### Dashboard Updates

The Bus Detail panel now displays:

**Tracking Information:**
- Tracking Status
- Tracking Source
- Freshness (with age in seconds)
- Location State
- Latitude
- Longitude
- Accuracy
- Speed
- Last Updated
- Route

### Controller Read-Only Policy

The Controller is **read-only** for /buses:
- No writes to /buses from Controller operations
- No modifications to GPS coordinates
- No changes to tracking status
- Driver App remains responsible for writing operational tracking data
- Controller only reads and interprets existing tracking data

### No Data Fabrication

The Controller does not fabricate:
- GPS coordinates (missing GPS shows as UNAVAILABLE, not 0)
- Tracking source (UNKNOWN is not converted to LIVE)
- Driver information (shows "Unknown" when unavailable)

### Dashboard Layout

The map is positioned between KPI cards and the fleet table:
1. KPI Cards (two rows)
2. Fleet Map
3. Fleet Status Table
4. Bus Detail Panel (when bus selected)

The fleet table is preserved and remains functional.

## Milestone 9: Trip and Route Management

### Trip and Route Management

The Controller now has comprehensive trip and route management capabilities for managing driver-bus assignments, routes, and scheduling.

### Controller Assignment as Authoritative Trip Record

The Controller's `/controller_assignments` Firebase path is the authoritative source for all trip/assignment records. Each assignment represents a scheduled trip with:

- **assignmentId**: Unique identifier (e.g., `assignment_1790240100623_w87a07`)
- **driverId**: Controller driver ID (e.g., `DRV001`)
- **driverUid**: Firebase UID (if driver is linked)
- **driverName**: Driver name
- **busId**: Bus ID derived from bus number (e.g., `bus_101`)
- **busNumber**: Bus number (e.g., `101`)
- **routeId**: Controller route ID (if selected)
- **routeName**: Route name (if selected)
- **from**: Origin location
- **via**: Intermediate location (optional)
- **to**: Destination location
- **scheduledDate**: Scheduled date (YYYY-MM-DD format)
- **scheduledDepartureTime**: Scheduled departure time (HH:mm format)
- **status**: Assignment status
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

### Route Registry

A Controller-owned route registry was created at `/controller_routes` to manage bus routes independently of Firebase `/buses`. Each route contains:

- **routeId**: Unique identifier (e.g., `route_1727268900000_abc123`)
- **routeName**: Human-readable route name
- **from**: Origin location
- **via**: Intermediate location (optional)
- **to**: Destination location
- **status**: Route status (active/inactive)
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

**Route API Endpoints:**

- **GET /api/controller/routes**: Returns all Controller routes from `/controller_routes`
- **GET /api/controller/routes/:routeId**: Returns a specific route from `/controller_routes`
- **POST /api/controller/routes**: Creates a new route in `/controller_routes`
- **PUT /api/controller/routes/:routeId**: Updates an existing route in `/controller_routes`

Routes are validated to ensure routeName, from, and to are provided. Deactivation (status = inactive) is preferred over deletion to preserve historical data.

**Important:** Controller routes are stored in `/controller_routes` and are completely separate from Firebase `/buses`. The `/buses` path contains operational tracking data only (GPS, location, etc.) and is not used for route definitions.

### Assignment Status Lifecycle

The assignment status follows a defined lifecycle:

**Status Values:**
- **SCHEDULED**: Trip is scheduled but not yet assigned
- **ASSIGNED**: Driver is assigned to the bus
- **ACTIVE**: Trip is in progress
- **COMPLETED**: Trip has been completed
- **CANCELLED**: Trip was cancelled
- **UNASSIGNED**: Driver is unassigned from the bus

**Valid Transitions:**
- SCHEDULED → ASSIGNED, CANCELLED
- ASSIGNED → ACTIVE, CANCELLED, UNASSIGNED
- ACTIVE → COMPLETED, CANCELLED
- COMPLETED → (terminal state)
- CANCELLED → (terminal state)
- UNASSIGNED → SCHEDULED, ASSIGNED

The backend validates all status transitions and rejects invalid transitions with a 400 error.

### Driver and Bus Selection

**Driver Selection:**
- Drivers are selected from the Controller driver registry (`/controller_drivers`)
- The backend resolves driverId to the Controller driver record
- The backend retrieves the Firebase UID from the Controller record
- The frontend does not select drivers from Firebase Auth

**Bus Selection:**
- Buses are selected by bus number (e.g., `101`, `038`)
- The backend converts bus number to bus ID: `bus_101`, `bus_038`
- Leading zeros are preserved
- The frontend does not select buses from Firebase `/buses`

### Schedule Validation

The backend validates scheduled date and time:

**Date Format:** YYYY-MM-DD (e.g., `2026-09-24`)
**Time Format:** HH:mm (e.g., `12:00`)

Invalid formats are rejected with a 400 error. No silent timezone conversion occurs.

### Conflict Detection

Before creating a new assignment, the backend checks for scheduling conflicts:

**Driver Conflict:** A driver cannot have two overlapping active/scheduled assignments at the same scheduled date and time.

**Bus Conflict:** A bus cannot have two overlapping active/scheduled assignments at the same scheduled date and time.

Conflict detection returns HTTP 409 with a descriptive error message:

```json
{
  "success": false,
  "message": "Driver already has an assignment at this scheduled time"
}
```

or

```json
{
  "success": false,
  "message": "Bus already has an assignment at this scheduled time"
}
```

Cancelled and completed assignments are excluded from conflict checks.

### Assignment Status API

**PUT /api/controller/assignments/:assignmentId/status**

Updates assignment status with lifecycle validation and Firebase claim synchronization.

**Status Update Behavior:**
- Validates status transition
- Updates assignment status in Firebase
- When transitioning to UNASSIGNED: removes driver's busId custom claim (if Firebase UID exists)
- When transitioning to ASSIGNED or ACTIVE: sets driver's busId custom claim (if Firebase UID exists)
- Returns warning if claim update fails (assignment is still valid)

### Assignment Creation API

**POST /api/controller/assignments**

Creates a new assignment with conflict detection and Firebase claim synchronization.

**Request Body:**
```json
{
  "driverId": "DRV001",
  "busNumber": "101",
  "from": "Hubli",
  "via": "Dharwad",
  "to": "Belgaum",
  "scheduledDate": "2026-09-24",
  "scheduledDepartureTime": "12:00",
  "routeId": "route_1727268900000_abc123",
  "status": "ASSIGNED"
}
```

**Creation Behavior:**
- Validates input data
- Resolves driverId to Controller driver record
- Converts busNumber to busId
- Validates routeId if provided (must exist in `/controller_routes`)
- Reads routeName from Controller route registry if routeId is provided
- Checks for driver/bus conflicts
- Creates assignment record in Firebase with routeId and routeName
- Sets driver's busId custom claim (if Firebase UID exists and status is ASSIGNED or ACTIVE)
- Returns warning if claim update fails (assignment is still valid)

**Note:** routeId is optional. If not provided, the assignment is created with manual from/via/to values only.

### Assignment UI

The Assignments page displays:

**Table Columns:**
- Assignment ID
- Driver (name + ID)
- Bus (number + ID)
- Route
- From
- Via
- To
- Date
- Departure
- Status
- Firebase Link
- Claim Status
- Actions

**Status-Based Actions:**
- **SCHEDULED**: Mark Assigned, Cancel
- **ASSIGNED**: Start Trip, Cancel, Unassign
- **ACTIVE**: Complete Trip, Cancel
- **COMPLETED**: View only
- **CANCELLED**: View only

**Trip Detail Panel:**
When an assignment is selected, a detail panel shows:

- **Trip**: Assignment ID, Status
- **Driver**: Driver ID, Driver Name, Firebase Link, Claim Status
- **Bus**: Bus Number, Bus ID
- **Route**: Route Name, From, Via, To
- **Schedule**: Date, Scheduled Departure, Created, Updated

### Assign Bus UI

The Assign Bus page allows creating new assignments with route selection:

**Form Fields:**
- Driver (dropdown from Controller registry)
- Bus Number (manual input)
- Route (optional dropdown from Controller route registry)
- From (manual input, auto-populated when route is selected)
- Via (manual input, auto-populated when route is selected)
- To (manual input, auto-populated when route is selected)
- Date (date picker)
- Departure Time (time picker)

**Route Selection Behavior:**
- When a route is selected from the dropdown, the From, Via, and To fields are automatically populated with the route's values
- The user can still manually edit these fields after selection
- If no route is selected, the user can manually enter From, Via, and To values
- routeId is sent to the backend only when a route is selected

### Routes UI

The Routes page provides full route management:

**Table Columns:**
- Route ID
- Route Name
- From
- Via
- To
- Status
- Actions

**Actions:**
- Create Route
- Edit Route
- Activate/Deactivate Route

Routes can be deactivated (status = inactive) rather than deleted to preserve historical data.

### Fleet Map Integration

The FleetMap popup now displays assignment information:

**When bus has an active assignment:**
- Assignment status
- Route name or route ID or constructed route string

**When bus has no assignment:**
- "Assignment: Unassigned"

No fake GPS is added. Assignment status is separate from tracking status.

### Dashboard Integration

The Dashboard continues to show operational tracking metrics. Assignment counts are not mixed with operational tracking numbers to maintain clear separation between:

- **Assignment status**: SCHEDULED, ASSIGNED, ACTIVE, COMPLETED, CANCELLED, UNASSIGNED
- **Tracking status**: active, inactive
- **Bus state**: ONLINE, OFFLINE
- **Freshness**: FRESH, STALE, UNKNOWN

### Firebase Claim Synchronization

The Milestone 4 Firebase claim behavior is preserved:

**When assignment is created/updated to ASSIGNED or ACTIVE:**
- If driver has a linked Firebase UID, the busId custom claim is set
- If claim update fails, a warning is returned but the assignment is still valid

**When assignment is updated to UNASSIGNED:**
- If driver has a linked Firebase UID, the busId custom claim is removed
- If claim removal fails, a warning is returned but the status update is still valid

**When assignment is CANCELLED or COMPLETED:**
- The busId custom claim is NOT automatically removed
- This preserves driver authorization until explicit unassignment

### Historical Assignment Preservation

All assignments are preserved in Firebase regardless of status:

- **CANCELLED**: Record remains with status = CANCELLED
- **COMPLETED**: Record remains with status = COMPLETED
- **UNASSIGNED**: Record remains with status = UNASSIGNED

No assignment records are deleted. This maintains complete trip history.

### Difference Between Assignment Status and Tracking Status

**Assignment Status (Controller-owned):**
- Represents the Controller's view of the trip lifecycle
- Values: SCHEDULED, ASSIGNED, ACTIVE, COMPLETED, CANCELLED, UNASSIGNED
- Managed by Controller through assignment API
- Independent of GPS data

**Tracking Status (Firebase /buses):**
- Represents the Driver App's view of GPS tracking
- Values: active, inactive
- Managed by Driver App
- Based on actual GPS updates

**Bus State (derived):**
- ONLINE: Recent GPS update (within threshold)
- OFFLINE: No recent GPS update

**Freshness (derived):**
- FRESH: GPS data is recent
- STALE: GPS data is old
- UNKNOWN: No GPS data

These concepts are kept separate to avoid confusion between Controller planning and operational reality.

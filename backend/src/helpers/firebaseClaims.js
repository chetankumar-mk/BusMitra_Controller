import { getAuth } from '../config/firebaseAdmin.js';

/**
 * Update driver's busId custom claim
 * Preserves all existing claims, only updates busId
 * 
 * @param {string} firebaseUid - Firebase UID of the driver
 * @param {string} busId - Bus ID to set in claims
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateDriverBusClaim(firebaseUid, busId) {
  try {
    const auth = getAuth();
    
    // Verify user exists
    const userRecord = await auth.getUser(firebaseUid);
    
    // Read existing claims
    const existingClaims = userRecord.customClaims || {};
    
    // Preserve all existing claims, only update busId
    const updatedClaims = {
      ...existingClaims,
      busId: busId
    };
    
    // Set updated claims
    await auth.setCustomUserClaims(firebaseUid, updatedClaims);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to update driver bus claim:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Remove driver's busId custom claim
 * Preserves all other claims including role
 * 
 * @param {string} firebaseUid - Firebase UID of the driver
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function removeDriverBusClaim(firebaseUid) {
  try {
    const auth = getAuth();
    
    // Verify user exists
    const userRecord = await auth.getUser(firebaseUid);
    
    // Read existing claims
    const existingClaims = userRecord.customClaims || {};
    
    // Remove only busId, preserve all other claims
    const { busId, ...remainingClaims } = existingClaims;
    
    // Set updated claims without busId
    await auth.setCustomUserClaims(firebaseUid, remainingClaims);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to remove driver bus claim:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Get driver's current busId from Firebase custom claims
 * 
 * @param {string} firebaseUid - Firebase UID of the driver
 * @returns {Promise<{success: boolean, busId?: string|null, error?: string}>}
 */
export async function getDriverBusClaim(firebaseUid) {
  try {
    const auth = getAuth();
    
    // Verify user exists
    const userRecord = await auth.getUser(firebaseUid);
    
    // Read existing claims
    const existingClaims = userRecord.customClaims || {};
    
    return { 
      success: true, 
      busId: existingClaims.busId || null 
    };
  } catch (error) {
    console.error('Failed to get driver bus claim:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

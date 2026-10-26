import dotenv from 'dotenv';
import { connectToMongoDB } from '../config/mongodb.js';
import Depot from '../models/Depot.js';
import ControllerUser from '../models/ControllerUser.js';
import { hashPassword } from '../helpers/password.js';

// Load environment variables
dotenv.config();

/**
 * Seed script to create development Controller account
 * Run with: node src/scripts/seedAuth.js
 * 
 * Environment variables:
 * - SEED_USERNAME (default: KSRTC)
 * - SEED_PASSWORD (default: 1234)
 * - SEED_DEPOT_ID (default: DEPOT_LAXMESHWAR)
 * - SEED_DEPOT_NAME (default: Laxmeshwar Depot)
 * - SEED_DEPOT_LOCATION (default: Laxmeshwar, Karnataka)
 * - SEED_DEPOT_CODE (default: LAX)
 */

async function seedAuth() {
  try {
    console.log('Starting authentication seed...');
    
    // Connect to MongoDB
    await connectToMongoDB();
    console.log('MongoDB connected');

    // Get seed data from environment or use defaults
    const username = process.env.SEED_USERNAME || 'KSRTC';
    const password = process.env.SEED_PASSWORD || '1234';
    const depotId = process.env.SEED_DEPOT_ID || 'DEPOT_LAXMESHWAR';
    const depotName = process.env.SEED_DEPOT_NAME || 'Laxmeshwar Depot';
    const depotLocation = process.env.SEED_DEPOT_LOCATION || 'Laxmeshwar, Karnataka';
    const depotCode = process.env.SEED_DEPOT_CODE || 'LAX';

    // Normalize username
    const normalizedUsername = username.toLowerCase().trim();

    // Check if depot already exists
    let depot = await Depot.findOne({ depotId });
    
    if (!depot) {
      console.log(`Creating depot: ${depotName}`);
      depot = await Depot.create({
        depotId,
        depotName,
        location: depotLocation,
        code: depotCode,
        isActive: true
      });
      console.log('Depot created successfully');
    } else {
      console.log(`Depot already exists: ${depotName}`);
    }

    // Check if user already exists
    let user = await ControllerUser.findOne({ username: normalizedUsername });
    
    if (!user) {
      console.log(`Creating controller user: ${username}`);
      
      // Hash the password
      const passwordHash = await hashPassword(password);
      
      user = await ControllerUser.create({
        username: normalizedUsername,
        passwordHash,
        depotId,
        depotName,
        role: 'controller_admin',
        isActive: true
      });
      console.log('Controller user created successfully');
    } else {
      console.log(`Controller user already exists: ${username}`);
      console.log('To update the password, delete the existing user first');
    }

    console.log('\n=== Seed Complete ===');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Depot: ${depotName} (${depotId})`);
    console.log(`Role: controller_admin`);
    console.log('\nIMPORTANT: Change the default password in production!');

  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

// Run seed
seedAuth().then(() => {
  console.log('Seed script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Seed script failed:', error);
  process.exit(1);
});

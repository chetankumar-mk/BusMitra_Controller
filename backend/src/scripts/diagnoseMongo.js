import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

console.log('=== MongoDB Connection Diagnostic ===\n');

// Check MONGODB_URI
const mongoUri = process.env.MONGODB_URI;
console.log('MONGODB_URI exists:', mongoUri ? 'YES' : 'NO');

if (mongoUri) {
  console.log('URI starts with mongodb+srv://:', mongoUri.startsWith('mongodb+srv://') ? 'YES' : 'NO');
  
  // Extract hostname safely (remove username/password)
  try {
    const url = new URL(mongoUri);
    const hostname = url.hostname;
    console.log('MongoDB hostname:', hostname);
    
    // Check for database name in URI
    const hasDbName = url.pathname && url.pathname.length > 1;
    console.log('URI contains database name after .net/:', hasDbName ? 'YES' : 'NO');
    
    if (hasDbName) {
      const dbName = url.pathname.substring(1); // Remove leading /
      console.log('Database name from URI:', dbName);
    } else {
      console.log('Database name from URI: (none specified in URI)');
    }
  } catch (error) {
    console.log('URI format valid: NO');
    console.log('Error parsing URI:', error.message);
  }
} else {
  console.log('URI format valid: NO (URI not set)');
  console.log('MongoDB hostname: (not available)');
  console.log('Database name: (not available)');
}

// Check SESSION_SECRET
const sessionSecret = process.env.SESSION_SECRET;
console.log('SESSION_SECRET exists:', sessionSecret ? 'YES' : 'NO');

console.log('\n=== Testing MongoDB Connection ===\n');

// Test connection
const dbName = 'busmitra_controller';
try {
  console.log('Attempting to connect to MongoDB...');
  await mongoose.connect(mongoUri, {
    dbName: dbName,
  });
  
  const readyState = mongoose.connection.readyState;
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  console.log('MongoDB connection test: CONNECTED');
  console.log('Mongoose readyState:', readyState, `(${stateMap[readyState]})`);
  
  await mongoose.connection.close();
  console.log('Connection closed successfully');
  
} catch (error) {
  console.log('MongoDB connection test: FAILED');
  console.log('Error type:', error.name);
  console.log('Error message:', error.message);
  
  if (error.name === 'MongooseServerSelectionError') {
    console.log('Reason: MongoDB Atlas server selection failed');
    console.log('Common causes:');
    console.log('  - IP address not whitelisted in MongoDB Atlas');
    console.log('  - Incorrect username or password');
    console.log('  - Cluster not running');
    console.log('  - Network connectivity issues');
  }
}

console.log('\n=== Diagnostic Complete ===');
process.exit(0);

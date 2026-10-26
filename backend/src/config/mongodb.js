import mongoose from 'mongoose';

let connection = null;

/**
 * Establish MongoDB connection
 * Reuses existing connection if already connected
 */
export async function connectToMongoDB() {
  if (connection) {
    return connection;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    connection = await mongoose.connect(mongoUri, {
      dbName: 'busmitra_controller',
    });

    console.log('MongoDB connected successfully');
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDBConnection() {
  if (connection) {
    await mongoose.connection.close();
    connection = null;
    console.log('MongoDB connection closed');
  }
}

/**
 * Get MongoDB connection status
 */
export function getMongoDBStatus() {
  return {
    isConnected: mongoose.connection.readyState === 1,
    state: mongoose.connection.readyState,
  };
}

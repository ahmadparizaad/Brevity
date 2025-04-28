import mongoose from 'mongoose';

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/brevity';

// Module-level cache
let cached: {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
} = { conn: null, promise: null };

export async function connectToDatabase() {
  // If we have a cached connection and it's connected, return it
  if (cached.conn && mongoose.connection.readyState === 1) {
    console.log('[MongoDB] Using existing database connection');
    return cached.conn;
  }

  // If we don't have a connection promise, create one
  if (!cached.promise) {
    console.log('[MongoDB] Creating new database connection');
    
    const opts = {
      bufferCommands: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    // Clear any existing connections first
    if (mongoose.connection.readyState !== 0) { // 0 = disconnected
      console.log('[MongoDB] Existing connection detected, closing it');
      await mongoose.disconnect();
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('[MongoDB] Successfully connected to database');
        return mongoose;
      })
      .catch((err) => {
        console.error('[MongoDB] Connection error:', err);
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    console.error('[MongoDB] Failed to establish connection:', err);
    throw err;
  }
}

// Event listeners for connection monitoring
mongoose.connection.on('connected', () => {
  console.log('[MongoDB] Connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('[MongoDB] Connection disconnected');
  // Reset the cache when disconnected
  cached.conn = null;
  cached.promise = null;
});
import mongoose from 'mongoose';

/**
 * Graceful MongoDB Connection Helper
 * Connects to the configured MongoDB instance without crashing the process if unavailable during initial scaffolding.
 */
export const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/salon_queue';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[Database] MongoDB connection warning: ${error.message}`);
    console.warn('[Database] Running in disconnected/memory mode for Step 1 health check.');
    return null;
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('[Database] MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] MongoDB reconnected.');
});

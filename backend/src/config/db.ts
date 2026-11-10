import mongoose from 'mongoose';
import { ENV } from './env.js';

let mongodInstance: any = null;

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', false);

  if (ENV.USE_IN_MEMORY_DB) {
    await connectInMemory();
    return;
  }

  try {
    console.log(`[DB] Attempting to connect to MongoDB at: ${ENV.MONGODB_URI}`);
    await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log('[DB] Successfully connected to MongoDB.');
  } catch (err: any) {
    console.warn(`[DB] Connection to local MongoDB failed (${err.message}).`);
    console.log('[DB] Launching embedded MongoDB Memory Server for seamless zero-config local operation...');
    await connectInMemory();
  }
}

async function connectInMemory() {
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create();
    const uri = mongodInstance.getUri();
    await mongoose.connect(uri);
    console.log(`[DB] Connected to In-Memory MongoDB at ${uri}. Database is fully functional and ready.`);
  } catch (memErr: any) {
    console.error('[DB] Failed to start MongoDB Memory Server:', memErr);
    throw memErr;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
}

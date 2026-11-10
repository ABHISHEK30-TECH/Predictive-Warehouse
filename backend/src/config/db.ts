import mongoose from "mongoose";
import { ENV } from "./env.js";

let mongodInstance: any = null;
let connectionPromise: Promise<void> | null = null;

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", false);

  // Reuse an existing connection.
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // Prevent multiple simultaneous connection attempts.
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    // Use in-memory MongoDB only when explicitly enabled.
    if (ENV.USE_IN_MEMORY_DB) {
      await connectInMemory();
      return;
    }

    try {
      console.log("[DB] Connecting to MongoDB...");

      await mongoose.connect(ENV.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
      });

      console.log("[DB] Successfully connected to MongoDB.");
    } catch (err: any) {
      // Never silently switch databases in production.
      if (ENV.NODE_ENV === "production") {
        console.error("[DB] Production MongoDB connection failed:", err);
        throw err;
      }

      // Keep the existing local-development fallback.
      console.warn(`[DB] MongoDB connection failed: ${err.message}`);

      console.log("[DB] Starting local in-memory MongoDB fallback...");

      await connectInMemory();
    }
  })();

  try {
    await connectionPromise;
  } finally {
    connectionPromise = null;
  }
}

async function connectInMemory(): Promise<void> {
  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");

    mongodInstance = await MongoMemoryServer.create();

    const uri = mongodInstance.getUri();

    await mongoose.connect(uri);

    console.log("[DB] Connected to in-memory MongoDB.");
  } catch (err: any) {
    console.error("[DB] Failed to start in-memory MongoDB:", err);
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongodInstance) {
    await mongodInstance.stop();
    mongodInstance = null;
  }
}

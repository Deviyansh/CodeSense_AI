import mongoose from "mongoose";
import { config } from "./index.js";
import { logger } from "../utils/logger.js";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return mongoose.connection;

  try {
    // Attempt Mongoose connection with a short timeout
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    });
    isConnected = true;
    logger.info("database.connected", { database: mongoose.connection.name,
      host: mongoose.connection.host, });
    return conn;
  } catch (err) {
    logger.error("database.connection_failed", {
      reason: "MongoDB connection failed",
      mode: config.env,
    });
    if (config.env === "production") {
      throw new Error("MongoDB connection is required in production. Verify MONGODB_URI and network access.");
    }
    logger.warn("database.in_memory_mode", {
      note: "Volatile in-memory persistence is enabled only for local development/test runs.",
    });
    return null;
  }
}

export function isDbConnected() {
  return isConnected;
}

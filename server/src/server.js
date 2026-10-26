import mongoose from "mongoose";
import "dotenv/config";
import app from "./app.js";
import { config } from "./config/index.js";
import { connectDB } from "./config/db.js";
import { logger } from "./utils/logger.js";

async function bootstrap() {
  if (config.env === "production") {
    if (!config.sessionSecret || config.sessionSecret.length < 32 || config.sessionSecret.toLowerCase().includes("replace-me")) {
      throw new Error("SESSION_SECRET must be set to a random value of at least 32 characters in production.");
    }
    if (!config.mongoUri || !/^mongodb(?:\+srv)?:\/\//.test(config.mongoUri)) {
      throw new Error("A valid MONGODB_URI is required in production.");
    }
  }

  await connectDB();

  const server = app.listen(config.port, () => {
    logger.info("server.started", {
      port: config.port,
      env: config.env,
      clientOrigin: config.clientOrigin,
    });
  });

  // Graceful shutdown
  
  const shutdown = (signal) => {
    logger.info("server.shutting_down", { signal });

    const forceExit = setTimeout(() => {
      process.exit(1);
    }, 5000);
    forceExit.unref();

    server.close(async () => {
      try {
        await mongoose.disconnect();
        logger.info("server.closed");
        process.exit(0);
      } catch {
        logger.error("server.shutdown_failed");
        process.exit(1);
      }
    });
  };


  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.error("server.startup_failed", { error: err.message, stack: err.stack });
  process.exit(1);
});

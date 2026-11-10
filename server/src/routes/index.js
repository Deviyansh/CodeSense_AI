import { Router } from "express";
import mongoose from "mongoose";
import authRoutes from "./auth.routes.js";
import repositoryRoutes from "./repository.routes.js";
import scanRoutes from "./scan.routes.js";
import findingRoutes from "./finding.routes.js";
import githubRoutes from "./github.routes.js";
import metricsRoutes from "./metrics.routes.js";
import { scanQueue } from "../queues/scan.queue.js";

const apiRouter = Router();

// API health and readiness check
apiRouter.get("/health", (_req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const queueMetrics = scanQueue.getMetrics();

  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      ready: true,
      service: "codesense-ai-api",
      database: isDbConnected ? "connected" : "memory-mode",
      queue: {
        status: "operational",
        ...queueMetrics,
      },
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

// Authentication
apiRouter.use("/auth", authRoutes);

// Repository management
apiRouter.use("/repositories", repositoryRoutes);

// Scan management
apiRouter.use("/scans", scanRoutes);

// Findings
apiRouter.use("/findings", findingRoutes);

// Metrics
apiRouter.use("/metrics", metricsRoutes);

// GitHub integration
apiRouter.use("/github", githubRoutes);

export default apiRouter;

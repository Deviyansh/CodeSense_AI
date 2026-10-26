
import { Router } from "express";
import authRoutes from "./auth.routes.js";
import repositoryRoutes from "./repository.routes.js";
import scanRoutes from "./scan.routes.js";
import findingRoutes from "./finding.routes.js";
import githubRoutes from "./github.routes.js";

const apiRouter = Router();

// API health check
apiRouter.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      message: "CodeSense AI API is running.",
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

// GitHub integration
apiRouter.use("/github", githubRoutes);

export default apiRouter;

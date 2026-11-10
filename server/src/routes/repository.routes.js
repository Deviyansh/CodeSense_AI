
import { Router } from "express";
import {
  listRepositories,
  createRepository,
  getRepositoryById,
  seedDemoRepository,
  removeRepository,
} from "../controllers/repository.controller.js";
import {
  queueScan,
  getRepositoryScans,
} from "../controllers/scan.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", listRepositories);
router.post("/", createRepository);
router.post("/seed-demo", seedDemoRepository);

router.get("/:id", getRepositoryById);
router.delete("/:id", removeRepository);

// Scan routes scoped by repository
router.post("/:id/scans", queueScan);
router.get("/:id/scans", getRepositoryScans);

export default router;

import { Router } from "express";
import { getMetricsSummary } from "../controllers/metrics.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", getMetricsSummary);

export default router;


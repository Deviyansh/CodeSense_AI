import { Router } from "express";
import { getFindingById, requestAIReview } from "../controllers/finding.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/:id", getFindingById);
router.post("/:id/review", requestAIReview);

export default router;

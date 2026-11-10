import { Router } from "express";
import {
  getFindingById,
  requestAIReview,
  triageFinding,
  validatePatch,
} from "../controllers/finding.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/:id", getFindingById);
router.post("/:id/review", requestAIReview);
router.post("/:id/triage", triageFinding);
router.post("/:id/patch/validate", validatePatch);

export default router;

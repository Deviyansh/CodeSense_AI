
import { Router } from "express";
import {
  listMyScans,
  getScanById,
  exportScanReport,
  compareScans,
} from "../controllers/scan.controller.js";
import { listFindingsByScan } from "../controllers/finding.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

// Keep the list route before the dynamic ID route.
router.get("/", listMyScans);
router.get("/:id", getScanById);
router.get("/:id/findings", listFindingsByScan);
router.get("/:id/report", exportScanReport);
router.get("/:id/diff/:compareScanId", compareScans);

export default router;

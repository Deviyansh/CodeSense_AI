import { Router } from "express";
import { register, login, logout, getMe, updateSettings } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);
router.patch("/settings", requireAuth, updateSettings);

export default router;

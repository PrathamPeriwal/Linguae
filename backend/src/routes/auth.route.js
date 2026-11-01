import express from "express";
import {
  login,
  logout,
  onboard,
  signup,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { toSafeUser } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.post("/signup", asyncHandler(signup));
router.post("/login", asyncHandler(login));
router.post("/logout", asyncHandler(logout));

router.post("/onboarding", asyncHandler(protectRoute), asyncHandler(onboard));

// check if user is logged in
router.get("/me", asyncHandler(protectRoute), asyncHandler((req, res) => {
  res.status(200).json({ success: true, user: toSafeUser(req.user) });
}));

export default router;

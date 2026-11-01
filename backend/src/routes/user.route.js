import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  acceptFriendRequest,
  getFriendRequests,
  getMyFriends,
  getOutgoingFriendReqs,
  getRecommendedUsers,
  sendFriendRequest,
} from "../controllers/user.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

// apply auth middleware to all routes
router.use(asyncHandler(protectRoute));

router.get("/", asyncHandler(getRecommendedUsers));
router.get("/friends", asyncHandler(getMyFriends));

router.post("/friend-request/:id", asyncHandler(sendFriendRequest));
router.put("/friend-request/:id/accept", asyncHandler(acceptFriendRequest));

router.get("/friend-requests", asyncHandler(getFriendRequests));
router.get("/outgoing-friend-requests", asyncHandler(getOutgoingFriendReqs));

export default router;

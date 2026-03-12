import { Router } from "express";
import {
  sendRequest,
  acceptRequest,
  rejectRequest,
  getFriends,
  getRequests,
  removeFriend,
} from "../controllers/friendsController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// All friend routes require authentication
router.use(authenticateToken);

router.post("/request", sendRequest);
router.post("/accept/:requestId", acceptRequest);
router.post("/reject/:requestId", rejectRequest);
router.get("/", getFriends);
router.get("/requests", getRequests);
router.delete("/:friendId", removeFriend);

export default router;

import { Router } from "express";
import { createMeeting, getMeeting, endMeeting } from "../controllers/meetingController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticateToken, createMeeting);
router.get("/:roomId", getMeeting); // Public — guests need to see host name
router.post("/:roomId/end", authenticateToken, endMeeting);

export default router;

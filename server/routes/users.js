import { Router } from "express";
import { getOnlineUsers } from "../controllers/usersController.js";

const router = Router();

router.get("/online", getOnlineUsers);

export default router;

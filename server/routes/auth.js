import { Router } from "express";
import { register, login, getMe, verifyOTP, resendOTP } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", login);
router.get("/me", authenticateToken, getMe);

export default router;

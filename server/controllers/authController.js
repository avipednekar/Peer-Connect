import User from "../models/User.js";
import { sendOTP } from "../config/emailService.js";

export const register = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(409).json({ error: "Email already registered." });
    }

    // Build user object but DON'T save yet — send email first
    let user;
    if (existingUser && !existingUser.isVerified) {
      existingUser.name = name;
      existingUser.password = password;
      user = existingUser;
    } else {
      user = new User({ name, email, password });
    }

    const otp = user.generateOTP();

    // Send OTP email BEFORE saving to avoid trapping the user
    try {
      await sendOTP(email, otp);
    } catch (emailErr) {
      console.error("Email send error:", emailErr);
      return res.status(500).json({ error: "Failed to send verification email. Please try again." });
    }

    // Email sent successfully — now commit user to DB
    await user.save();

    res.status(201).json({
      message: "OTP sent to your email. Please verify to complete registration.",
      email,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email already registered." });
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error during registration." });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const otp = req.body.otp?.trim();

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email is already verified." });
    }

    if (!user.verifyOTP(otp)) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    const token = user.generateAuthToken();
    res.json({ token, user, message: "Email verified successfully!" });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email is already verified." });
    }

    const otp = user.generateOTP();

    // Send email BEFORE saving
    try {
      await sendOTP(email, otp);
    } catch (emailErr) {
      console.error("Email resend error:", emailErr);
      return res.status(500).json({ error: "Failed to resend OTP." });
    }

    await user.save();
    res.json({ message: "New OTP sent to your email." });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

export const login = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: "Email not verified. Please check your email for OTP.",
        needsVerification: true,
        email,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = user.generateAuthToken();
    res.json({ token, user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("friends", "name email");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({ user });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

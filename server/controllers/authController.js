import User from "../models/User.js";

export const register = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered." });
    }

    const user = new User({ name, email, password });
    await user.save();

    const token = user.generateAuthToken();

    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email already registered." });
    }

    console.error("Register error:", err);
    res.status(500).json({ error: "Server error during registration." });
  }
};

export const login = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
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
    const user = await User.findById(req.userId).populate(
      "friends",
      "name email",
    );
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({ user });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

import jwt from "jsonwebtoken";

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
}

export function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    // Allow genuinely unauthenticated connections (guests joining via shareable link)
    // They have NO token at all — this is intentional for guest access
    socket.userId = null;
    return next();
  }

  // If a token IS provided, it MUST be valid — no fallback to guest
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    // Reject invalid/expired tokens — don't degrade to guest
    next(new Error("Invalid or expired token. Please re-login."));
  }
}

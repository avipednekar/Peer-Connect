import dotenv from "dotenv";
dotenv.config({ path: import.meta.dirname + "/../.env" });

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import { createWorkers } from "./config/mediasoup.js";
import { authenticateSocket } from "./middleware/auth.js";
import { setupSocketHandlers } from "./sockets/socketHandlers.js";

import authRoutes from "./routes/auth.js";
import friendsRoutes from "./routes/friends.js";
import usersRoutes from "./routes/users.js";
import meetingsRoutes from "./routes/meetings.js";

// Initialize Express app and HTTP server
const app = express();
const server = createServer(app);

// Parse allowed CORS origins from env
const corsOrigins = [
  "http://localhost:5173",
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
];

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
  },
});

// Socket.IO auth + handlers
io.use(authenticateSocket);
setupSocketHandlers(io);

// ─── Middleware ────────────────────────────────────────
app.use(express.json());

// ─── API Routes ───────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/meetings", meetingsRoutes);

// ─── Start Server ─────────────────────────────────────
const PORT = process.env.PORT || 4000;

const startServer = async () => {
  await connectDB();
  await createWorkers();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();

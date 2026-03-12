// Holds online users memory map (userId -> active socket ids)
export const onlineUsers = new Map();

const getPrimarySocketId = (userId) => {
  const socketIds = onlineUsers.get(userId);
  return socketIds ? Array.from(socketIds)[0] : null;
};

export const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(
      `✅ Connected: ${socket.id} (user: ${socket.userId || "guest"})`,
    );

    // Track online users
    if (socket.userId) {
      const existingSockets = onlineUsers.get(socket.userId) ?? new Set();
      const isFirstConnection = existingSockets.size === 0;

      existingSockets.add(socket.id);
      onlineUsers.set(socket.userId, existingSockets);

      if (isFirstConnection) {
        io.emit("user-online", socket.userId);
      }
    }

    // ── Room Signaling ──
    socket.on("join-room", ({ roomId, displayName }) => {
      socket.join(roomId);
      socket.displayName = displayName;
      socket.currentRoom = roomId;
      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
        displayName,
        userId: socket.userId,
      });
      console.log(`👤 ${displayName} (${socket.id}) joined room: ${roomId}`);
    });

    socket.on("offer", ({ roomId, offer }) => {
      socket.to(roomId).emit("offer", offer);
    });

    socket.on("answer", ({ roomId, answer }) => {
      socket.to(roomId).emit("answer", answer);
    });

    socket.on("ice-candidate", ({ roomId, candidate }) => {
      socket.to(roomId).emit("ice-candidate", candidate);
    });

    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      socket.to(roomId).emit("user-left", {
        socketId: socket.id,
        displayName: socket.displayName,
      });
      socket.currentRoom = null;
      console.log(`👋 ${socket.displayName} left room: ${roomId}`);
    });

    // ── Friend Calling ──
    socket.on("call-friend", ({ friendId, roomId, callerName }) => {
      const friendSocketId = getPrimarySocketId(friendId);
      if (friendSocketId) {
        io.to(friendSocketId).emit("incoming-call", {
          roomId,
          callerId: socket.userId,
          callerName,
          callerSocketId: socket.id,
        });
        console.log(`📞 ${callerName} calling friend ${friendId}`);
      } else {
        socket.emit("call-failed", { reason: "User is offline." });
      }
    });

    socket.on("call-accepted", ({ callerId, roomId }) => {
      const callerSocketId = getPrimarySocketId(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit("call-accepted", { roomId });
      }
    });

    socket.on("call-rejected", ({ callerId }) => {
      const callerSocketId = getPrimarySocketId(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit("call-rejected");
      }
    });

    socket.on("call-cancelled", ({ friendId }) => {
      const friendSocketId = getPrimarySocketId(friendId);
      if (friendSocketId) {
        io.to(friendSocketId).emit("call-cancelled");
      }
    });

    // ── Disconnect ──
    socket.on("disconnect", () => {
      console.log(`❌ Disconnected: ${socket.id}`);

      if (socket.userId) {
        const existingSockets = onlineUsers.get(socket.userId);

        if (existingSockets) {
          existingSockets.delete(socket.id);

          if (existingSockets.size === 0) {
            onlineUsers.delete(socket.userId);
            io.emit("user-offline", socket.userId);
          }
        }
      }

      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit("user-left", {
          socketId: socket.id,
          displayName: socket.displayName,
        });
      }
    });
  });
};

import Meeting from "../models/Meeting.js";
import {
  getOrCreateRoom,
  deleteRoom,
  getRoom,
  createWebRtcTransport,
} from "../config/mediasoup.js";

// ─── Online Users ──────────────────────────────────────
export const onlineUsers = new Map(); // userId -> Set<socketId>

const getPrimarySocketId = (userId) => {
  const socketIds = onlineUsers.get(userId);
  return socketIds ? Array.from(socketIds)[0] : null;
};

// ─── Helper: Clean up peer from SFU room ──────────────
const cleanupPeer = (roomId, socketId) => {
  const room = getRoom(roomId);
  if (!room) return;

  const peer = room.peers.get(socketId);
  if (!peer) return;

  // Close all transports (this also closes producers & consumers)
  for (const transport of peer.transports.values()) {
    transport.close();
  }

  room.peers.delete(socketId);

  // If room is empty, delete it
  if (room.peers.size === 0) {
    deleteRoom(roomId);
  }
};

// ─── Main Socket Handler Setup ─────────────────────────
export const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`✅ Connected: ${socket.id} (user: ${socket.userId || "guest"})`);

    // ── Online User Tracking ──
    if (socket.userId) {
      const existing = onlineUsers.get(socket.userId) ?? new Set();
      const isFirst = existing.size === 0;
      existing.add(socket.id);
      onlineUsers.set(socket.userId, existing);
      if (isFirst) io.emit("user-online", socket.userId);
    }

    // ════════════════════════════════════════════════════
    // ── SFU / Room Signaling ──
    // ════════════════════════════════════════════════════

    // 1. Join room — get router RTP capabilities
    socket.on("join-room", async ({ roomId, displayName }, callback) => {
      try {
        socket.currentRoom = roomId;
        socket.displayName = displayName;
        socket.join(roomId);

        const room = await getOrCreateRoom(roomId);

        // Register peer in SFU room
        room.peers.set(socket.id, {
          displayName,
          userId: socket.userId,
          transports: new Map(),
          producers: new Map(),
          consumers: new Map(),
        });

        // Update Meeting model
        await Meeting.findOneAndUpdate(
          { roomId, isActive: true },
          {
            $push: {
              participants: {
                userId: socket.userId || null,
                displayName,
                socketId: socket.id,
              },
            },
          },
        );

        // Get existing participants for the joiner
        const existingPeers = [];
        for (const [peerId, peerData] of room.peers) {
          if (peerId === socket.id) continue;
          existingPeers.push({
            socketId: peerId,
            displayName: peerData.displayName,
            userId: peerData.userId,
            producers: Array.from(peerData.producers.values()).map((p) => ({
              producerId: p.id,
              kind: p.kind,
            })),
          });
        }

        // Get meeting info for host badge
        const meeting = await Meeting.findOne({ roomId, isActive: true });

        // Send RTP capabilities + existing peers to the joiner
        callback({
          rtpCapabilities: room.router.rtpCapabilities,
          existingPeers,
          hostId: meeting?.host?.toString() || null,
        });

        // Notify existing peers about new participant
        socket.to(roomId).emit("new-peer", {
          socketId: socket.id,
          displayName,
          userId: socket.userId,
        });

        console.log(`👤 ${displayName} (${socket.id}) joined room: ${roomId}`);
      } catch (err) {
        console.error("join-room error:", err);
        callback({ error: err.message });
      }
    });

    // 2. Create WebRTC transport (send or receive)
    socket.on("create-transport", async ({ roomId, direction }, callback) => {
      try {
        const room = getRoom(roomId);
        if (!room) return callback({ error: "Room not found" });

        const peer = room.peers.get(socket.id);
        if (!peer) return callback({ error: "Not in room" });

        const { transport, params } = await createWebRtcTransport(room.router);

        // Store transport by ID
        peer.transports.set(transport.id, transport);

        callback(params);
      } catch (err) {
        console.error("create-transport error:", err);
        callback({ error: err.message });
      }
    });

    // 3. Connect transport (DTLS handshake)
    socket.on("connect-transport", async ({ roomId, transportId, dtlsParameters }, callback) => {
      try {
        const room = getRoom(roomId);
        const peer = room?.peers.get(socket.id);
        const transport = peer?.transports.get(transportId);

        if (!transport) return callback({ error: "Transport not found" });

        await transport.connect({ dtlsParameters });
        callback({ connected: true });
      } catch (err) {
        console.error("connect-transport error:", err);
        callback({ error: err.message });
      }
    });

    // 4. Produce (publish a track)
    socket.on("produce", async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => {
      try {
        const room = getRoom(roomId);
        const peer = room?.peers.get(socket.id);
        const transport = peer?.transports.get(transportId);

        if (!transport) return callback({ error: "Transport not found" });

        const producer = await transport.produce({ kind, rtpParameters, appData });

        peer.producers.set(producer.id, producer);

        producer.on("transportclose", () => {
          peer.producers.delete(producer.id);
        });

        // Notify all other peers to consume this new producer
        socket.to(roomId).emit("new-producer", {
          producerSocketId: socket.id,
          producerId: producer.id,
          kind: producer.kind,
        });

        callback({ producerId: producer.id });
      } catch (err) {
        console.error("produce error:", err);
        callback({ error: err.message });
      }
    });

    // 5. Consume (subscribe to a producer)
    socket.on("consume", async ({ roomId, producerId, rtpCapabilities }, callback) => {
      try {
        const room = getRoom(roomId);
        if (!room) return callback({ error: "Room not found" });

        const peer = room.peers.get(socket.id);
        if (!peer) return callback({ error: "Not in room" });

        if (!room.router.canConsume({ producerId, rtpCapabilities })) {
          return callback({ error: "Cannot consume this producer" });
        }

        // Find the receive transport (use last created transport that isn't producer transport)
        let consumerTransport = null;
        for (const transport of peer.transports.values()) {
          // Use the transport that doesn't have producers on it, or the second transport
          consumerTransport = transport;
        }

        if (!consumerTransport) return callback({ error: "No receive transport" });

        const consumer = await consumerTransport.consume({
          producerId,
          rtpCapabilities,
          paused: true, // Start paused, client resumes after attaching
        });

        peer.consumers.set(consumer.id, consumer);

        consumer.on("transportclose", () => {
          peer.consumers.delete(consumer.id);
        });

        consumer.on("producerclose", () => {
          peer.consumers.delete(consumer.id);
          socket.emit("producer-closed", { consumerId: consumer.id });
        });

        callback({
          consumerId: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
      } catch (err) {
        console.error("consume error:", err);
        callback({ error: err.message });
      }
    });

    // 6. Resume consumer
    socket.on("resume-consumer", async ({ roomId, consumerId }, callback) => {
      try {
        const room = getRoom(roomId);
        const peer = room?.peers.get(socket.id);
        const consumer = peer?.consumers.get(consumerId);

        if (!consumer) return callback?.({ error: "Consumer not found" });

        await consumer.resume();
        callback?.({ resumed: true });
      } catch (err) {
        console.error("resume-consumer error:", err);
        callback?.({ error: err.message });
      }
    });

    // 7. Leave room
    socket.on("leave-room", async (roomId) => {
      socket.leave(roomId);

      cleanupPeer(roomId, socket.id);

      // Remove from Meeting model
      await Meeting.findOneAndUpdate(
        { roomId, isActive: true },
        { $pull: { participants: { socketId: socket.id } } },
      ).catch(() => {});

      socket.to(roomId).emit("peer-left", {
        socketId: socket.id,
        displayName: socket.displayName,
      });

      socket.currentRoom = null;
      console.log(`👋 ${socket.displayName} left room: ${roomId}`);
    });

    // 8. Host ends meeting for all
    socket.on("host-end-meeting", async ({ roomId }) => {
      try {
        const meeting = await Meeting.findOne({ roomId, isActive: true });
        if (!meeting || meeting.host.toString() !== socket.userId) return;

        meeting.isActive = false;
        meeting.participants = [];
        await meeting.save();

        // Notify all participants
        io.to(roomId).emit("meeting-ended", {
          reason: "Host ended the meeting.",
        });

        // Clean up SFU room
        const room = getRoom(roomId);
        if (room) {
          for (const [peerId] of room.peers) {
            cleanupPeer(roomId, peerId);
          }
          deleteRoom(roomId);
        }

        console.log(`🛑 Host ended meeting: ${roomId}`);
      } catch (err) {
        console.error("host-end-meeting error:", err);
      }
    });

    // ════════════════════════════════════════════════════
    // ── Encrypted Chat ──
    // ════════════════════════════════════════════════════

    socket.on("chat-message", ({ roomId, encryptedData, senderName, timestamp }) => {
      socket.to(roomId).emit("chat-message", {
        encryptedData,
        senderName,
        senderId: socket.id,
        timestamp,
      });
    });

    // ════════════════════════════════════════════════════
    // ── Friend Calling ──
    // ════════════════════════════════════════════════════

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

    // ════════════════════════════════════════════════════
    // ── Disconnect ──
    // ════════════════════════════════════════════════════

    socket.on("disconnect", async () => {
      console.log(`❌ Disconnected: ${socket.id}`);

      // Online tracking
      if (socket.userId) {
        const existing = onlineUsers.get(socket.userId);
        if (existing) {
          existing.delete(socket.id);
          if (existing.size === 0) {
            onlineUsers.delete(socket.userId);
            io.emit("user-offline", socket.userId);
          }
        }
      }

      // Room cleanup
      if (socket.currentRoom) {
        const roomId = socket.currentRoom;

        cleanupPeer(roomId, socket.id);

        await Meeting.findOneAndUpdate(
          { roomId, isActive: true },
          { $pull: { participants: { socketId: socket.id } } },
        ).catch(() => {});

        socket.to(roomId).emit("peer-left", {
          socketId: socket.id,
          displayName: socket.displayName,
        });
      }
    });
  });
};

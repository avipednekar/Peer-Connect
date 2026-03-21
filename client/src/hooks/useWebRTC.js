import { useRef, useState, useCallback, useEffect } from "react";
import { io } from "socket.io-client";
import { Device } from "mediasoup-client";

const emitWithTimeout = (socket, event, data, timeoutMs = 15000) => {
  return new Promise((resolve, reject) => {
    let timer;
    const responseHandler = (res) => {
      clearTimeout(timer);
      if (res && res.error) reject(new Error(res.error));
      else resolve(res);
    };
    timer = setTimeout(() => {
      reject(new Error(`Socket timeout on event: ${event}`));
    }, timeoutMs);
    socket.emit(event, data, responseHandler);
  });
};

export function useWebRTC(token) {
  const [connectionState, setConnectionState] = useState("idle");
  // idle | joining | connected | failed
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [incomingCall, setIncomingCall] = useState(null);
  const [participants, setParticipants] = useState([]); // [{ socketId, displayName, userId, stream }]
  const [hostId, setHostId] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producersRef = useRef(new Map()); // kind -> producer
  const consumersRef = useRef(new Map()); // consumerId -> consumer
  const currentRoomRef = useRef(null);

  // ─── Socket.IO Connection ──────────────────────────
  useEffect(() => {
    const socket = io({
      auth: { token: token || undefined },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    // Online users
    socket.on("user-online", (userId) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });

    socket.on("user-offline", (userId) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    // ── SFU Events ──

    // New peer joined the room
    socket.on("new-peer", ({ socketId, displayName, userId }) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === socketId)) return prev;
        return [...prev, { socketId, displayName, userId, streams: {} }];
      });
    });

    // New producer available — consume it
    socket.on("new-producer", async ({ producerSocketId, producerId, kind }) => {
      await consumeProducer(socket, producerSocketId, producerId, kind);
    });

    // Producer closed remotely
    socket.on("producer-closed", ({ consumerId }) => {
      const consumer = consumersRef.current.get(consumerId);
      if (consumer) {
        consumer.close();
        consumersRef.current.delete(consumerId);
      }
    });

    // Peer paused their producer (toggled mute/video)
    socket.on("peer-producer-paused", ({ socketId, kind }) => {
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.socketId !== socketId) return p;
          return { ...p, [`is${kind}Paused`]: true };
        }),
      );
    });

    socket.on("peer-producer-resumed", ({ socketId, kind }) => {
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.socketId !== socketId) return p;
          return { ...p, [`is${kind}Paused`]: false };
        }),
      );
    });

    // Peer left
    socket.on("peer-left", ({ socketId }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
    });

    // Host ended meeting
    socket.on("meeting-ended", ({ reason }) => {
      cleanupRoom();
      setError(reason || "Meeting has ended.");
      setConnectionState("idle");
    });

    // ── Friend Calling ──
    socket.on("incoming-call", ({ roomId, callerId, callerName }) => {
      setIncomingCall({ roomId, callerId, callerName });
    });

    socket.on("call-accepted", () => {});

    socket.on("call-rejected", () => {
      setError("Call was declined.");
    });

    socket.on("call-cancelled", () => {
      setIncomingCall(null);
    });

    socket.on("call-failed", ({ reason }) => {
      setError(reason);
    });

    // Fetch initial online users
    fetch("/api/users/online")
      .then((r) => r.json())
      .then((data) => setOnlineUsers(new Set(data.onlineUserIds || [])))
      .catch(() => {});

    // Reconnection handling
    socket.on("reconnect", () => {
      if (currentRoomRef.current) {
        console.log("🔄 Socket reconnected, rejoining room...");
        // The room state is lost on reconnect, would need full rejoin
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Consume a remote producer ──────────────────────
  const consumeProducer = useCallback(
    async (socket, producerSocketId, producerId, kind) => {
      if (!deviceRef.current || !recvTransportRef.current) return;

      const roomId = currentRoomRef.current;
      if (!roomId) return;

      try {
        const data = await emitWithTimeout(socket, "consume", {
          roomId,
          producerId,
          rtpCapabilities: deviceRef.current.rtpCapabilities,
        });

        const consumer = await recvTransportRef.current.consume({
          id: data.consumerId,
          producerId: data.producerId,
          kind: data.kind,
          rtpParameters: data.rtpParameters,
        });

        consumersRef.current.set(consumer.id, consumer);

        // Resume the consumer on the server
        socket.emit("resume-consumer", { roomId, consumerId: consumer.id }, () => {});

        // Attach stream to corresponding participant
        setParticipants((prev) =>
          prev.map((p) => {
            if (p.socketId !== producerSocketId) return p;
            const newStreams = { ...p.streams };

            // Create or update MediaStream
            if (!newStreams[kind]) {
              newStreams[kind] = new MediaStream();
            }
            newStreams[kind].addTrack(consumer.track);

            return { 
              ...p, 
              streams: newStreams,
              [`is${kind}Paused`]: data.producerPaused
            };
          }),
        );

        consumer.on("trackended", () => {
          consumersRef.current.delete(consumer.id);
        });

        setConnectionState("connected");
      } catch (err) {
        console.error("Error consuming producer:", err);
      }
    },
    [],
  );

  const createSendTransport = useCallback(async (socket, roomId, device) => {
    const params = await emitWithTimeout(socket, "create-transport", { roomId, direction: "send" });

    const transport = device.createSendTransport(params);

    transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
      try {
        await emitWithTimeout(socket, "connect-transport", { roomId, transportId: transport.id, dtlsParameters });
        callback();
      } catch (err) {
        errback(err);
      }
    });

    transport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const result = await emitWithTimeout(socket, "produce", { roomId, transportId: transport.id, kind, rtpParameters, appData });
        callback({ id: result.producerId });
      } catch (err) {
        errback(err);
      }
    });

    transport.on("connectionstatechange", (state) => {
      if (state === "failed") {
        console.error("Send transport connection failed");
        transport.close();
      }
    });

    sendTransportRef.current = transport;
    return transport;
  }, []);

  const createRecvTransport = useCallback(async (socket, roomId, device) => {
    const params = await emitWithTimeout(socket, "create-transport", { roomId, direction: "recv" });

    const transport = device.createRecvTransport(params);

    transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
      try {
        await emitWithTimeout(socket, "connect-transport", { roomId, transportId: transport.id, dtlsParameters });
        callback();
      } catch (err) {
        errback(err);
      }
    });

    transport.on("connectionstatechange", (state) => {
      if (state === "failed") {
        console.error("Recv transport connection failed");
        transport.close();
      }
    });

    recvTransportRef.current = transport;
    return transport;
  }, []);

  // ─── Cleanup Room Resources ─────────────────────────
  const cleanupRoom = useCallback(() => {
    // Close producers
    for (const producer of producersRef.current.values()) {
      producer.close();
    }
    producersRef.current.clear();

    // Close consumers
    for (const consumer of consumersRef.current.values()) {
      consumer.close();
    }
    consumersRef.current.clear();

    // Close transports
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();
    sendTransportRef.current = null;
    recvTransportRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    if (localVideoRef.current) localVideoRef.current.srcObject = null;

    setParticipants([]);
    setIsMuted(false);
    setIsVideoOff(false);
    setHostId(null);
    currentRoomRef.current = null;
  }, []);

  // ─── Join Room ──────────────────────────────────────
  const joinRoom = useCallback(
    async (roomId, displayName, mediaSettings = {}, previewStream = null) => {
      const { micOn = true, camOn = true } = mediaSettings;
      const socket = socketRef.current;
      if (!socket) return;

      try {
        setError(null);
        setConnectionState("joining");
        currentRoomRef.current = roomId;

        // 1. Get local media (recycle from Lobby if provided to seamlessly prevent permission drops on mobile)
        if (localStreamRef.current && localStreamRef.current !== previewStream) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
        }

        let stream = previewStream;
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        }
        
        localStreamRef.current = stream;
        setLocalStream(stream);

        // 2. Join room — get RTP capabilities + existing peers
        const { rtpCapabilities, existingPeers, hostId: meetingHostId } = await emitWithTimeout(
          socket,
          "join-room",
          { roomId, displayName }
        );

        setHostId(meetingHostId);

        // 3. Load mediasoup Device
        const device = new Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        deviceRef.current = device;

        // 4. Create send & receive transports in parallel
        const [sendTransport] = await Promise.all([
          createSendTransport(socket, roomId, device),
          createRecvTransport(socket, roomId, device),
        ]);

        // 5. Produce local audio + video
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];

        if (audioTrack) {
          const audioProducer = await sendTransport.produce({ track: audioTrack });
          producersRef.current.set("audio", audioProducer);
          // Apply pre-join mic setting
          if (!micOn) {
            audioProducer.pause();
            setIsMuted(true);
          }
        }
        if (videoTrack) {
          const videoProducer = await sendTransport.produce({ track: videoTrack });
          producersRef.current.set("video", videoProducer);
          // Apply pre-join camera setting
          if (!camOn) {
            videoProducer.pause();
            videoTrack.enabled = false;
            setIsVideoOff(true);
          }
        }

        // 6. Consume existing peers' producers
        setParticipants(
          existingPeers.map((p) => ({
            socketId: p.socketId,
            displayName: p.displayName,
            userId: p.userId,
            streams: {},
          })),
        );

        for (const peer of existingPeers) {
          for (const { producerId, kind } of peer.producers) {
            await consumeProducer(socket, peer.socketId, producerId, kind);
          }
        }

        setConnectionState(existingPeers.length > 0 ? "connected" : "joining");
      } catch (err) {
        console.error("Error joining room:", err);

        if (err.name === "NotAllowedError") {
          setError("Camera/microphone access denied. Please allow permissions.");
        } else if (err.name === "NotFoundError") {
          setError("No camera or microphone found.");
        } else {
          setError(`Failed to join: ${err.message}`);
        }

        cleanupRoom();
        setConnectionState("idle");
      }
    },
    [createSendTransport, createRecvTransport, consumeProducer, cleanupRoom],
  );

  // ─── Leave Room ─────────────────────────────────────
  const leaveRoom = useCallback(() => {
    socketRef.current?.emit("leave-room", currentRoomRef.current);
    cleanupRoom();
    setConnectionState("idle");
  }, [cleanupRoom]);

  // ─── Host End Meeting ───────────────────────────────
  const hostEndMeeting = useCallback(() => {
    const roomId = currentRoomRef.current;
    if (!roomId) return;
    socketRef.current?.emit("host-end-meeting", { roomId });
    cleanupRoom();
    setConnectionState("idle");
  }, [cleanupRoom]);

  // ─── Toggle Mute ────────────────────────────────────
  const toggleMute = useCallback(() => {
    const audioProducer = producersRef.current.get("audio");
    if (!audioProducer) return;
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];

    if (audioProducer.paused) {
      if (audioTrack) audioTrack.enabled = true;
      audioProducer.resume();
      socketRef.current?.emit("resume-producer", { roomId: currentRoomRef.current, producerId: audioProducer.id });
      setIsMuted(false);
    } else {
      if (audioTrack) audioTrack.enabled = false;
      audioProducer.pause();
      socketRef.current?.emit("pause-producer", { roomId: currentRoomRef.current, producerId: audioProducer.id });
      setIsMuted(true);
    }
  }, []);

  // ─── Toggle Video ──────────────────────────────────
  const toggleVideo = useCallback(() => {
    const videoProducer = producersRef.current.get("video");
    if (!videoProducer) return;
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];

    if (videoProducer.paused) {
      if (videoTrack) videoTrack.enabled = true;
      videoProducer.resume();
      socketRef.current?.emit("resume-producer", { roomId: currentRoomRef.current, producerId: videoProducer.id });
      setIsVideoOff(false);
    } else {
      if (videoTrack) videoTrack.enabled = false;
      videoProducer.pause();
      socketRef.current?.emit("pause-producer", { roomId: currentRoomRef.current, producerId: videoProducer.id });
      setIsVideoOff(true);
    }
  }, []);

  // ─── Friend Calling ─────────────────────────────────
  const callFriend = useCallback((friendId, callerName) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    socketRef.current?.emit("call-friend", { friendId, roomId, callerName });
    return roomId;
  }, []);

  const acceptCall = useCallback(() => {
    if (!incomingCall) return null;
    socketRef.current?.emit("call-accepted", {
      callerId: incomingCall.callerId,
      roomId: incomingCall.roomId,
    });
    const roomId = incomingCall.roomId;
    setIncomingCall(null);
    return roomId;
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    if (incomingCall) {
      socketRef.current?.emit("call-rejected", { callerId: incomingCall.callerId });
      setIncomingCall(null);
    }
  }, [incomingCall]);

  // ─── Cleanup on unmount ─────────────────────────────
  useEffect(() => {
    const handleUnload = () => {
      if (currentRoomRef.current) {
        socketRef.current?.emit("leave-room", currentRoomRef.current);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  return {
    connectionState,
    isMuted,
    isVideoOff,
    error,
    setError,
    setIsMuted,
    setIsVideoOff,
    localVideoRef,
    participants,
    hostId,
    joinRoom,
    leaveRoom,
    hostEndMeeting,
    toggleMute,
    toggleVideo,
    onlineUsers,
    incomingCall,
    callFriend,
    acceptCall,
    rejectCall,
    socket: socketRef,
    localStream,
  };
}

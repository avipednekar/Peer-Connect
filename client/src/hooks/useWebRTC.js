import { useRef, useState, useCallback, useEffect } from "react";
import { io } from "socket.io-client";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTC(token) {
  const [connectionState, setConnectionState] = useState("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState(null);
  const [peerName, setPeerName] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [incomingCall, setIncomingCall] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const candidateQueueRef = useRef([]);
  const currentRoomRef = useRef(null);

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }

      setConnectionState("connected");
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("ice-candidate", {
          roomId: currentRoomRef.current,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected"
      ) {
        setConnectionState("failed");
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  useEffect(() => {
    const socket = io({
      auth: { token: token || undefined },
    });
    socketRef.current = socket;

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

    socket.on("user-joined", async ({ displayName }) => {
      setPeerName(displayName);

      try {
        const pc = peerConnectionRef.current ?? createPeerConnection();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { roomId: currentRoomRef.current, offer });
      } catch (err) {
        console.error("Error creating offer:", err);
        setError("Failed to create connection offer.");
      }
    });

    socket.on("offer", async (offer) => {
      try {
        const pc = peerConnectionRef.current ?? createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        for (const candidate of candidateQueueRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        candidateQueueRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit("answer", {
          roomId: currentRoomRef.current,
          answer,
        });
      } catch (err) {
        console.error("Error handling offer:", err);
        setError("Failed to handle incoming call.");
      }
    });

    socket.on("answer", async (answer) => {
      try {
        const pc = peerConnectionRef.current;
        if (!pc) {
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        for (const candidate of candidateQueueRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        candidateQueueRef.current = [];
      } catch (err) {
        console.error("Error handling answer:", err);
      }
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        const pc = peerConnectionRef.current;
        if (pc?.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          candidateQueueRef.current.push(candidate);
        }
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    });

    socket.on("user-left", () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      candidateQueueRef.current = [];
      setPeerName(null);
      setConnectionState("joining");

      if (currentRoomRef.current && localStreamRef.current) {
        createPeerConnection();
      }
    });

    socket.on("incoming-call", ({ roomId, callerId, callerName }) => {
      setIncomingCall({ roomId, callerId, callerName });
    });

    socket.on("call-accepted", () => {
      // Caller navigation is handled by the app shell.
    });

    socket.on("call-rejected", () => {
      setError("Call was declined.");
    });

    socket.on("call-cancelled", () => {
      setIncomingCall(null);
    });

    socket.on("call-failed", ({ reason }) => {
      setError(reason);
    });

    fetch("/api/users/online")
      .then((response) => response.json())
      .then((data) => setOnlineUsers(new Set(data.onlineUserIds || [])))
      .catch(() => {});

    return () => {
      socket.disconnect();
    };
  }, [createPeerConnection, token]);

  const joinRoom = useCallback(
    async (roomId, displayName) => {
      try {
        setError(null);
        setConnectionState("joining");
        currentRoomRef.current = roomId;

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        createPeerConnection();
        socketRef.current?.emit("join-room", { roomId, displayName });
      } catch (err) {
        console.error("Error joining room:", err);

        if (err.name === "NotAllowedError") {
          setError(
            "Camera/microphone access denied. Please allow permissions and try again.",
          );
        } else if (err.name === "NotFoundError") {
          setError("No camera or microphone found on this device.");
        } else {
          setError(`Failed to access camera/microphone. ${err.message}`);
        }

        setConnectionState("idle");
      }
    },
    [createPeerConnection],
  );

  const leaveRoom = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    socketRef.current?.emit("leave-room", currentRoomRef.current);
    currentRoomRef.current = null;
    candidateQueueRef.current = [];
    setConnectionState("idle");
    setIsMuted(false);
    setIsVideoOff(false);
    setPeerName(null);
  }, []);

  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  }, []);

  const callFriend = useCallback((friendId, callerName) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    socketRef.current?.emit("call-friend", { friendId, roomId, callerName });
    return roomId;
  }, []);

  const acceptCall = useCallback(() => {
    if (!incomingCall) {
      return null;
    }

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
      socketRef.current?.emit("call-rejected", {
        callerId: incomingCall.callerId,
      });
      setIncomingCall(null);
    }
  }, [incomingCall]);

  return {
    connectionState,
    isMuted,
    isVideoOff,
    error,
    peerName,
    localVideoRef,
    remoteVideoRef,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleVideo,
    onlineUsers,
    incomingCall,
    callFriend,
    acceptCall,
    rejectCall,
    socket: socketRef,
  };
}

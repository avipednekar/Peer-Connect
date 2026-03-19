import mediasoup from "mediasoup";

// mediasoup Worker settings
const workerSettings = {
  rtcMinPort: 10000,
  rtcMaxPort: 10100,
  logLevel: "warn",
  logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
};

// Router media codecs
const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "x-google-start-bitrate": 1000,
    },
  },
  {
    kind: "video",
    mimeType: "video/VP9",
    clockRate: 90000,
    parameters: {
      "profile-id": 2,
      "x-google-start-bitrate": 1000,
    },
  },
  {
    kind: "video",
    mimeType: "video/H264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "profile-level-id": "4d0032",
      "level-asymmetry-allowed": 1,
      "x-google-start-bitrate": 1000,
    },
  },
];

// WebRTC transport settings
const webRtcTransportOptions = {
  listenInfos: [
    {
      protocol: "udp",
      ip: "0.0.0.0",
      announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP || "127.0.0.1",
    },
    {
      protocol: "tcp",
      ip: "0.0.0.0",
      announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP || "127.0.0.1",
    },
  ],
  initialAvailableOutgoingBitrate: 1000000,
  minimumAvailableOutgoingBitrate: 600000,
  maxSctpMessageSize: 262144,
  maxIncomingBitrate: 1500000,
};

// ─── Worker & Room Management ──────────────────────────

let worker;
const rooms = new Map(); // roomId -> { router, peers: Map<socketId, peerData> }

export const createWorker = async () => {
  worker = await mediasoup.createWorker(workerSettings);

  worker.on("died", () => {
    console.error("❌ mediasoup Worker died, exiting...");
    setTimeout(() => process.exit(1), 2000);
  });

  console.log(`📡 mediasoup Worker created (pid: ${worker.pid})`);
  return worker;
};

export const getOrCreateRoom = async (roomId) => {
  if (rooms.has(roomId)) {
    return rooms.get(roomId);
  }

  const router = await worker.createRouter({ mediaCodecs });
  const room = {
    router,
    peers: new Map(), // socketId -> { transports: Map, producers: Map, consumers: Map, displayName, userId }
  };

  rooms.set(roomId, room);
  console.log(`🏠 Created mediasoup room: ${roomId}`);
  return room;
};

export const deleteRoom = (roomId) => {
  const room = rooms.get(roomId);
  if (room) {
    room.router.close();
    rooms.delete(roomId);
    console.log(`🗑️ Deleted mediasoup room: ${roomId}`);
  }
};

export const getRoom = (roomId) => rooms.get(roomId);

export const createWebRtcTransport = async (router) => {
  const transport = await router.createWebRtcTransport(webRtcTransportOptions);

  transport.on("dtlsstatechange", (dtlsState) => {
    if (dtlsState === "closed") {
      transport.close();
    }
  });

  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters,
    },
  };
};

export { mediaCodecs, webRtcTransportOptions };

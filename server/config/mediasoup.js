import mediasoup from "mediasoup";
import os from "os";

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

// Per-peer limits (rate limiting / DoS protection)
export const PEER_LIMITS = {
  maxTransports: 4,   // 2 send + 2 recv (with room for renegotiation)
  maxProducers: 4,    // audio + video + screen share audio + screen share video
  maxConsumers: 40,   // consuming from up to ~20 participants × 2 tracks
};

// ─── Multi-Worker Pool ─────────────────────────────────

const workers = [];
let nextWorkerIdx = 0;
const rooms = new Map(); // roomId -> { router, peers, workerId }

const createSingleWorker = async (index) => {
  const worker = await mediasoup.createWorker(workerSettings);

  worker.on("died", async () => {
    console.error(`❌ mediasoup Worker ${index} (pid: ${worker.pid}) died. Respawning...`);

    // Tear down rooms that were on this worker
    for (const [roomId, room] of rooms) {
      if (room.workerId === index) {
        // Notify peers that the room is gone (handled by disconnect events)
        room.router.close();
        rooms.delete(roomId);
        console.warn(`🗑️ Room ${roomId} torn down (worker ${index} died)`);
      }
    }

    // Respawn
    try {
      workers[index] = await createSingleWorker(index);
      console.log(`✅ mediasoup Worker ${index} respawned (pid: ${workers[index].pid})`);
    } catch (err) {
      console.error(`❌ Failed to respawn worker ${index}:`, err);
    }
  });

  console.log(`📡 mediasoup Worker ${index} created (pid: ${worker.pid})`);
  return worker;
};

export const createWorkers = async () => {
  const numWorkers = Math.max(1, Math.min(os.cpus().length, 4)); // 1-4 workers

  for (let i = 0; i < numWorkers; i++) {
    const worker = await createSingleWorker(i);
    workers.push(worker);
  }

  console.log(`📡 ${numWorkers} mediasoup worker(s) ready`);
};

// Round-robin worker selection
const getNextWorker = () => {
  const worker = workers[nextWorkerIdx];
  nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
  return { worker, workerIdx: (nextWorkerIdx === 0 ? workers.length : nextWorkerIdx) - 1 };
};

export const getOrCreateRoom = async (roomId) => {
  if (rooms.has(roomId)) {
    return rooms.get(roomId);
  }

  const { worker, workerIdx } = getNextWorker();
  const router = await worker.createRouter({ mediaCodecs });
  const room = {
    router,
    workerId: workerIdx,
    peers: new Map(), // socketId -> peer data
  };

  rooms.set(roomId, room);
  console.log(`🏠 Created mediasoup room: ${roomId} (worker ${workerIdx})`);
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

export const createWebRtcTransport = async (router, direction) => {
  const transport = await router.createWebRtcTransport(webRtcTransportOptions);

  // Tag transport with direction for later filtering
  transport.appData = { direction };

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

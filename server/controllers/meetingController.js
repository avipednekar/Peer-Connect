import Meeting from "../models/Meeting.js";

export const createMeeting = async (req, res) => {
  try {
    const roomId = req.body.roomId;

    if (!roomId) {
      return res.status(400).json({ error: "Room ID is required." });
    }

    // Check if meeting already exists and is active
    const existing = await Meeting.findOne({ roomId, isActive: true });
    if (existing) {
      return res.status(409).json({ error: "A meeting with this room ID is already active." });
    }

    const user = await import("../models/User.js").then((m) => m.default.findById(req.userId));

    const meeting = new Meeting({
      roomId,
      host: req.userId,
      hostName: user.name,
    });
    await meeting.save();

    res.status(201).json({ meeting });
  } catch (err) {
    console.error("Create meeting error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

export const getMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId })
      .sort({ createdAt: -1 })
      .populate("host", "name email");

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    res.json({
      roomId: meeting.roomId,
      hostName: meeting.hostName,
      hostId: meeting.host._id,
      isActive: meeting.isActive,
      participantCount: meeting.participants.length,
      settings: meeting.settings,
      createdAt: meeting.createdAt,
    });
  } catch (err) {
    console.error("Get meeting error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

export const endMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({
      roomId: req.params.roomId,
      isActive: true,
    });

    if (!meeting) {
      return res.status(404).json({ error: "Active meeting not found." });
    }

    if (meeting.host.toString() !== req.userId) {
      return res.status(403).json({ error: "Only the host can end the meeting." });
    }

    meeting.isActive = false;
    meeting.participants = [];
    await meeting.save();

    res.json({ message: "Meeting ended." });
  } catch (err) {
    console.error("End meeting error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    displayName: { type: String, required: true },
    socketId: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const meetingSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  hostName: {
    type: String,
    required: true,
  },
  participants: [participantSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
  settings: {
    maxParticipants: { type: Number, default: 20 },
    chatEnabled: { type: Boolean, default: true },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Meeting = mongoose.model("Meeting", meetingSchema);
export default Meeting;

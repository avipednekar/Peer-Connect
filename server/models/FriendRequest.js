import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Only one pending request should exist per sender/receiver pair at a time.
friendRequestSchema.index(
  { from: 1, to: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  },
);

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);
export default FriendRequest;

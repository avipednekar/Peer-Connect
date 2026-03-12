import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";

// Send friend request by email
export const sendRequest = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const targetUser = await User.findOne({ email: email.toLowerCase() });
    if (!targetUser) {
      return res.status(404).json({ error: "No user found with that email." });
    }

    if (targetUser._id.toString() === req.userId) {
      return res
        .status(400)
        .json({ error: "You cannot send a friend request to yourself." });
    }

    // Check if already friends
    const currentUser = await User.findById(req.userId);
    if (currentUser.friends.includes(targetUser._id)) {
      return res.status(400).json({ error: "Already friends with this user." });
    }

    // Check for existing request in either direction
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: req.userId, to: targetUser._id, status: "pending" },
        { from: targetUser._id, to: req.userId, status: "pending" },
      ],
    });

    if (existingRequest) {
      // If they already sent us a request, auto-accept it
      if (existingRequest.from.toString() === targetUser._id.toString()) {
        existingRequest.status = "accepted";
        await existingRequest.save();
        await User.findByIdAndUpdate(req.userId, {
          $addToSet: { friends: targetUser._id },
        });
        await User.findByIdAndUpdate(targetUser._id, {
          $addToSet: { friends: req.userId },
        });
        return res.json({
          message: "Friend request auto-accepted! You are now friends.",
          status: "accepted",
        });
      }
      return res.status(400).json({ error: "Friend request already sent." });
    }

    const request = new FriendRequest({ from: req.userId, to: targetUser._id });
    await request.save();

    res.status(201).json({ message: "Friend request sent!", request });
  } catch (err) {
    console.error("Friend request error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

// Accept friend request
export const acceptRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ error: "Friend request not found." });
    }

    if (request.to.toString() !== req.userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to accept this request." });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Request already processed." });
    }

    request.status = "accepted";
    await request.save();

    // Add to both users' friends lists
    await User.findByIdAndUpdate(request.from, {
      $addToSet: { friends: request.to },
    });
    await User.findByIdAndUpdate(request.to, {
      $addToSet: { friends: request.from },
    });

    res.json({ message: "Friend request accepted!" });
  } catch (err) {
    console.error("Accept friend error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

// Reject friend request
export const rejectRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request || request.to.toString() !== req.userId) {
      return res.status(404).json({ error: "Friend request not found." });
    }

    request.status = "rejected";
    await request.save();

    res.json({ message: "Friend request rejected." });
  } catch (err) {
    console.error("Reject friend error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

// Get friends list with online status
export const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate(
      "friends",
      "name email",
    );
    res.json({ friends: user.friends || [] });
  } catch (err) {
    console.error("Get friends error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

// Get pending friend requests (received)
export const getRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      to: req.userId,
      status: "pending",
    }).populate("from", "name email");
    res.json({ requests });
  } catch (err) {
    console.error("Get requests error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

// Remove friend
export const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;

    await User.findByIdAndUpdate(req.userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: req.userId } });

    // Clean up the friend request record
    await FriendRequest.deleteMany({
      $or: [
        { from: req.userId, to: friendId },
        { from: friendId, to: req.userId },
      ],
    });

    res.json({ message: "Friend removed." });
  } catch (err) {
    console.error("Remove friend error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

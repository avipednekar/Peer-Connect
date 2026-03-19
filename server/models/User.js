import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
    default: null,
  },
  otpExpiresAt: {
    type: Date,
    default: null,
  },
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign({ userId: this._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Generate 6-digit OTP
userSchema.methods.generateOTP = function () {
  const otp = crypto.randomInt(100000, 999999).toString();
  this.otp = otp;
  this.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function (candidateOTP) {
  if (!this.otp || !this.otpExpiresAt) return false;
  if (new Date() > this.otpExpiresAt) return false;
  return this.otp === candidateOTP;
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpiresAt;
  return obj;
};

const User = mongoose.model("User", userSchema);
export default User;

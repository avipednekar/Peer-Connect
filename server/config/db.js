import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is extremely required but not defined in .env",
      );
    }

    const uri = process.env.MONGODB_URI.trim();
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`📦 Connected to MongoDB: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

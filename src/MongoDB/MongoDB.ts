import mongoose from "mongoose";
import { config } from "dotenv";
config();

export class MongoDB {
  private static instance: MongoDB;
  private constructor() {}

  public static getInstance(): MongoDB {
    if (!MongoDB.instance) {
      MongoDB.instance = new MongoDB();
    }
    return MongoDB.instance;
  }

  public async connect(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error("MongoDB URI is not defined in environment variables");
      }

      await mongoose.connect(mongoUri, {
        // These options help handle connection issues
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    } catch (error: any) {
      if (error.name === "MongoServerError" && error.code === 18) {
        console.error("Authentication failed. Please check your credentials.");
      } else {
        console.error("Error connecting to MongoDB:", error);
      }
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
    } catch (error) {
      console.error("Error disconnecting from MongoDB:", error);
    }
  }
}

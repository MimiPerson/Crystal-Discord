import { model, Schema } from "mongoose";

const guildConfig = new Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  channelNames: {
    live: { type: String, default: "" },
    offline: { type: String, default: "" },
  },
});

const streamerSchema = new Schema(
  {
    // Basic streamer info
    twitchId: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: false },

    // Channel details

    isLive: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    // Discord integration settings
    guilds: [guildConfig],

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  }
);

// Indexes for better query performance

streamerSchema.index({ "guilds.channelId": 1 });

export const Streamer = model("streamer", streamerSchema);

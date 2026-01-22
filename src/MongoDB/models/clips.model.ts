import { model, Schema } from "mongoose";


const clipSchema = new Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    roles: [{ type: String, required: true }],
    streamerName: { type: String, required: true },
}, { timestamps: true });


export const ClipConfig = model("clipConfig", clipSchema);
import { Streamer } from "../../MongoDB/models/streamer.model";
import TwitchClient from "../TwitchWebsocket";

async function getStreamersOnline(): Promise<string[] | undefined> {
  try {
    const apiClient = TwitchClient.getApiClient();
    if (!apiClient) {
      throw new Error("API client not initialized");
    }

    const streamers = (await Streamer.find({}, { name: 1, _id: 0 })).map(
      (streamer) => streamer.name
    );

    if (streamers.length === 0) {
      console.warn("No streamers found in database");
      return;
    }

    const onlineStreamers = await apiClient.asUser(
      TwitchClient.CONFIG.userId,
      (ctx) => {
        return ctx.streams.getStreamsByUserNames(streamers);
      }
    );

    return onlineStreamers.map((stream) => stream.userName);
  } catch (error) {
    console.error("Error fetching online streamers:", error);
    return undefined;
  }
}

export default getStreamersOnline;

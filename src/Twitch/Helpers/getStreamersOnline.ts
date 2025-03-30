import { error } from "console";
import { Streamer } from "../../MongoDB/models/streamer.model";
import TwitchClient from "../TwitchWebsocket";

async function getStreamersOnline(): Promise<string[] | undefined> {
  const apiClient = TwitchClient.getApiClient();
  if (!apiClient) return;
  const streamers = (await Streamer.find({}, { name: 1, _id: 0 })).map(
    (streamer) => streamer.name
  );

  if (streamers.length === 0) return;
  const onlineStreamers = await apiClient.asUser(
    TwitchClient.CONFIG.userId,
    (ctx) => {
      return ctx.streams.getStreamsByUserNames(streamers);
    }
  );

  return onlineStreamers.map((stream) => stream.userName);
}
export default getStreamersOnline;

import Helper from "../helperClass";
import TwitchClient from "../TwitchWebsocket";

async function getStreamersOnline(): Promise<string[] | undefined> {
  const apiClient = await TwitchClient.getApiClient();
  if (!apiClient) return;
  const streamers = (await Helper.getChannels()).map((streamer) =>
    streamer.slice(1)
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

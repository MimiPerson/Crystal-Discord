import { TextBasedChannel, PermissionsBitField } from "discord.js";
import Helper from "../helperClass";
import TwitchClient, { initializeClients } from "../../Twitch/TwitchWebsocket";
import { Streamer } from "../../MongoDB/models/streamer.model";

async function handleAddStreamer(interaction: any, options: any) {
  const streamerName = (
    options.get("streamer", true).value as string
  ).toLowerCase();
  const channelId = (options.get("channel", true).channel as TextBasedChannel)
    .id;

  const updateLive =
    (options.get("updatechannel", false)?.value as boolean) || false;
  const liveName = (options.get("livename", false)?.value as string) || "";
  const offlineName =
    (options.get("offlinename", false)?.value as string) || "";

  if ((liveName || offlineName) && (!liveName || !offlineName)) {
    return interaction.reply({
      content: "Please provide both live and offline channel names.",
      flags: 64,
    });
  }
  const interactionGuildId: string = interaction.guildId!;
  const streamerFetch = await TwitchClient.getApiClient().users.getUserByName(
    streamerName
  );
  if (!streamerFetch) {
    return interaction.reply({
      content: `Streamer ${streamerName} not found.`,
      flags: 64,
    });
  }

  const streamerData = await Streamer.findOne({ name: streamerName });

  const streamer =
    streamerData ||
    new Streamer({
      name: streamerName,
      createdAt: new Date(),
    });

  streamer.twitchId = streamerFetch?.id;
  streamer.guilds.push({
    guildId: interactionGuildId,
    channelId: channelId,
    channelNames: {
      live: liveName === "" ? "" : liveName,
      offline: offlineName === "" ? "" : offlineName,
    },
  });
  streamer.updatedAt = new Date();

  await streamer.save();

  Helper.registerCommands();
  initializeClients();
  if (!interaction) return;

  interaction.reply({
    content: `Added ${streamerName} to the list of monitored streamers.`,
    flags: 64,
  });
}
export default handleAddStreamer;

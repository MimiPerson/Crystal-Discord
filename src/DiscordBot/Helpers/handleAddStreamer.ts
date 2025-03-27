import { promises } from "fs";
import { TextBasedChannel } from "discord.js";
import Helper from "../helperClass";
import { initializeClients } from "../../Twitch/TwitchWebsocket";
import { streamer } from "../interfaces";

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

  if (updateLive && (!liveName || !offlineName)) {
    return interaction.reply({
      content: "Please provide both live and offline channel names.",
      flags: 64,
    });
  }
  const guildId = interaction.guildId!;

  const channelsData: streamer[] = JSON.parse(
    await promises.readFile("./channels.json", "utf-8")
  );

  const streamerData: streamer = {
    channel: `#${streamerName}`,
    Guilds: [
      {
        guildId,
        channelId,
        updateLive,
        channelNames: [liveName, offlineName],
      },
    ],
  };
  let streamerFound = false;
  for (const streamer of channelsData) {
    if (streamer.channel === `#${streamerName}`) {
      if (streamer.Guilds.some((g) => g.channelId === channelId)) {
        return interaction.reply({
          content: `This channel is already registered for ${streamerName}.`,
          flags: 64,
        });
      }
      streamer.Guilds.push({
        guildId,
        channelId,
        updateLive,
        channelNames: [liveName, offlineName],
      });
      streamerFound = true;
      break;
    }
  }

  if (!streamerFound) {
    channelsData.push(streamerData);
  }

  await promises.writeFile(
    "./channels.json",
    JSON.stringify(channelsData, null, 4),
    "utf-8"
  );

  Helper.registerCommands();
  initializeClients();
  if (!interaction) return;

  interaction.reply({
    content: `Added ${streamerName} to the list of monitored streamers.`,
    flags: 64,
  });
}
export default handleAddStreamer;

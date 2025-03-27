import { CacheType, CommandInteraction } from "discord.js";
import { streamer } from "../interfaces";
import { promises } from "fs";
import Helper from "../helperClass";
import { initializeClients } from "../../Twitch/TwitchWebsocket";

async function handleRemoveStreamer(
  interaction: CommandInteraction<CacheType>,
  options: any
) {
  const streamerToRemove = options.get("streamer", true).value as string;
  const channel = await interaction.guild?.channels.cache.find(
    (c) => c.name === (options.get("channel", true).value as string)
  );
  const channelToRemoveId = channel?.id;

  let removed = false;

  const channelsData: streamer[] = JSON.parse(
    await promises.readFile("./channels.json", "utf-8")
  );
  for (const streamer of channelsData) {
    if (streamer.channel.toLowerCase() === streamerToRemove.toLowerCase()) {
      const originalLength = streamer.Guilds.length;
      streamer.Guilds = streamer.Guilds.filter(
        (guild) => guild.channelId !== channelToRemoveId
      );
      if (streamer.Guilds.length === 0)
        channelsData.splice(channelsData.indexOf(streamer), 1);

      removed = streamer.Guilds.length < originalLength;
    }
  }

  // Remove streamers with no guilds left
  const filteredChannelsData = channelsData.filter(
    (streamer) => streamer.Guilds.length > 0
  );

  await promises.writeFile(
    "./channels.json",
    JSON.stringify(filteredChannelsData, null, 4),
    "utf-8"
  );
  Helper.registerCommands();

  initializeClients();

  const channelName = channel?.name.toString() || "Unknown Channel";
  if (!interaction) return;
  interaction.reply({
    content: `${
      removed ? "Successfully removed" : "Failed to remove"
    } ${streamerToRemove} from logging to ${channelName}.`,
    flags: 64,
  });
}
export default handleRemoveStreamer;

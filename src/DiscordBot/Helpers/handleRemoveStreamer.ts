import { CacheType, CommandInteraction } from "discord.js";
import { streamer } from "../interfaces";
import { promises } from "fs";
import Helper from "../helperClass";
import { initializeClients } from "../../Twitch/TwitchWebsocket";
import { Streamer } from "../../MongoDB/models/streamer.model";

async function handleRemoveStreamer(
  interaction: CommandInteraction<CacheType>,
  options: any
) {
  const streamerToRemove = options
    .get("streamer", true)
    .value.toLowerCase() as string;
  const channel = interaction.guild?.channels.cache.find(
    (c) => c.name === (options.get("channel", true).value as string)
  );
  const channelToRemoveId = channel?.id;

  if (!channelToRemoveId) {
    return interaction.reply({
      content: `Channel not found.`,
      flags: 64,
    });
  }

  const streamer = await Streamer.findOne({ name: streamerToRemove });

  if (!streamer) {
    return interaction.reply({
      content: `Streamer ${streamerToRemove} not found.`,
      flags: 64,
    });
  }

  const guildIndex = streamer.guilds.findIndex(
    (guild) => guild.channelId === channelToRemoveId
  );
  if (guildIndex !== -1) {
    streamer.guilds.splice(guildIndex, 1);
  }

  if (streamer.guilds.length === 0) {
    await streamer.deleteOne();
  } else {
    streamer.updatedAt = new Date();
    await streamer.save();
  }

  interaction.reply({
    content: `Streamer ${streamerToRemove} removed successfully.`,
    flags: 64,
  });
  Helper.registerCommands();

  initializeClients();
  return;
}
export default handleRemoveStreamer;

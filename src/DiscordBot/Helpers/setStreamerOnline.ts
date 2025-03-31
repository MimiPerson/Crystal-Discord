import DiscordBot from "../DiscordBot";
import { PermissionsBitField, TextChannel } from "discord.js";
import { Streamer } from "../../MongoDB/models/streamer.model";

export async function setStreamersOnline(channels: string[]) {
  const channelsData = await Streamer.find({
    "guilds.channelId": { $ne: "" },
  });
  if (!channelsData) return;
  const client = DiscordBot.getClient();
  if (!client) return;

  channelsData.forEach((streamer) => {
    streamer.guilds.forEach(async (guild) => {
      if (guild.channelNames?.live == "") return;
      const live = channels.includes(streamer.name);
      const channel = (await client.channels.cache.get(
        guild.channelId
      )) as TextChannel;

      if (!channel) return;

      // Check if bot has required permissions
      const botMember = channel.guild.members.me;
      if (!botMember) return;

      const permissions = channel.permissionsFor(botMember);
      if (!permissions?.has(PermissionsBitField.Flags.ManageChannels)) {
        console.warn(
          `Missing ManageChannels permission in ${channel.name} (${channel.guild.name})`
        );
        return;
      }

      const channelName = live
        ? (guild.channelNames?.live as string)
        : (guild.channelNames?.offline as string);
      try {
        await channel.setName(channelName);
      } catch (err) {
        console.error(
          `Failed to update channel name in ${channel.guild.name}:`,
          err
        );
      }
    });
  });
}

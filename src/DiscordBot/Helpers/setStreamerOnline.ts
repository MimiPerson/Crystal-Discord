import { promises } from "fs";
import { streamer } from "../interfaces";
import DiscordBot from "../DiscordBot";
import { PermissionsBitField, TextChannel } from "discord.js";

export async function setStreamersOnline(channels: string[]) {
  const channelsData = JSON.parse(
    await promises.readFile("./channels.json", "utf-8")
  ) as streamer[];
  const client = DiscordBot.getClient();
  if (!client) return;

  channelsData.forEach((streamer) => {
    streamer.Guilds.forEach(async (guild) => {
      if (!guild.updateLive) return;

      const live = channels.includes(streamer.channel.slice(1));
      const discordGuild = await client.guilds.cache.get(guild.guildId);
      const channel = (await discordGuild?.channels.cache.get(
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

      const channelName = guild.channelNames[live ? 0 : 1];
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

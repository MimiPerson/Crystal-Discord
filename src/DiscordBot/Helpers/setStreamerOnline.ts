import { promises } from "fs";
import { streamer } from "../interfaces";
import DiscordBot from "../DiscordBot";
import { TextChannel } from "discord.js";

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
      const channelName = guild.channelNames[live ? 0 : 1];
      channel.setName(channelName).catch((err) => {
        console.error(err);
      });
    });
  });
}

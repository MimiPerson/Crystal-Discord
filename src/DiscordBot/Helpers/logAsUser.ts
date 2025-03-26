import { promises } from "fs";
import { streamer, user } from "../interfaces";
import DiscordBot from "../DiscordBot";
import { TextChannel } from "discord.js";
import {
  formatMessageWithEmojis,
  getOrCreateWebhook,
  sendWebhookMessage,
} from "./helpers";

/**
 * Logs messages as specified users to specified stream channels.
 *
 * @param users - Array of user objects containing message, user, and profilePictureUrl
 * @param streamChannel - Stream channel(s) to log to
 */
export async function logAsUser(
  users: user[],
  streamChannel: string[] | string
): Promise<void> {
  const client = DiscordBot.getClient();
  if (!client) return;
  const channelsData = JSON.parse(
    await promises.readFile("./channels.json", "utf-8")
  ) as streamer[];

  const streamChannels = Array.isArray(streamChannel)
    ? streamChannel
    : [streamChannel];

  const messagePromises: Promise<any>[] = [];

  for (const user of users) {
    for (const channelName of streamChannels) {
      const channelDetails = channelsData.find(
        (streamer) => streamer.channel.replace("#", "") === channelName
      );

      if (!channelDetails) continue;

      // Process each guild channel only once
      const processedChannels = new Set<string>();

      for (const guildInfo of channelDetails.Guilds) {
        const channelKey = `${guildInfo.guildId}-${guildInfo.channelId}`;
        if (processedChannels.has(channelKey)) continue;
        processedChannels.add(channelKey);

        const discordGuild = client.guilds.cache.get(guildInfo.guildId);
        const channel = discordGuild?.channels.cache.get(guildInfo.channelId);

        if (!discordGuild || !(channel instanceof TextChannel)) continue;

        const formattedMessage = formatMessageWithEmojis(
          user.message,
          discordGuild
        );

        const messagePromise = (async () => {
          const webhook = await getOrCreateWebhook(
            channel,
            "Crystal Socket",
            "https://i.imgur.com/nrhRy0b.png"
          );

          if (!webhook) return;

          try {
            await sendWebhookMessage(
              webhook,
              formattedMessage,
              user.user,
              user.profilePictureUrl ?? "https://i.imgur.com/nrhRy0b.png"
            );
          } catch (error) {
            DiscordBot.webhookCache.delete(channelKey);
          }
        })();

        messagePromises.push(messagePromise);
      }
    }
  }

  // Wait for all messages to be sent
  await Promise.all(messagePromises);
}

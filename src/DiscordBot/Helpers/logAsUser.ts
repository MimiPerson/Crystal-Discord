import { promises } from "fs";
import { streamer, user } from "../interfaces";
import DiscordBot from "../DiscordBot";
import { ApplicationEmoji, TextChannel } from "discord.js";

import {
  formatMessageWithEmojis,
  getOrCreateWebhook,
  sendWebhookMessage,
} from "./helpers";
import { parseMessageWithEmotes } from "./7tv";
import { ChatMessage } from "@twurple/chat";

/**
 * Logs messages as specified users to specified stream channels.
 *
 * @param users - Array of user objects containing message, user, and profilePictureUrl
 * @param streamChannel - Stream channel(s) to log to
 */
export async function logAsUser(
  users: user[],
  streamChannel: string[] | string,
  msg?: ChatMessage
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
            const links = await parseMessageWithEmotes(
              formattedMessage,
              msg?.emoteOffsets instanceof Map
                ? Array.from(msg.emoteOffsets.entries())
                    .map(([key, value]) => `${key}:${value.join(",")}`)
                    .join("/")
                : "",
              msg?.channelId || ""
            );
            const emoteMap = await loadEmotes(links);
            let parsedMessage = formattedMessage;

            for (const emote of emoteMap) {
              if (!emote) continue;
              const emojis = await client.application?.emojis.fetch();

              const emojiString = emojis
                ?.find((emoji) => emoji.name === emote.emoteName.slice(0, 32))
                ?.toString();
              if (emojiString) {
                parsedMessage = parsedMessage.replace(
                  new RegExp(`\\b${emote.emoteName}\\b`, "g"),
                  emojiString
                );
              }
            }
            await sendWebhookMessage(
              webhook,
              parsedMessage,
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

  async function loadEmotes(emoteMap: { emoteName: string; link: string }[]) {
    const client = DiscordBot.getClient();
    if (!client) return [];

    const uniqueEmotes = new Map<string, { emoteName: string; link: string }>();
    emoteMap.forEach((emote) => {
      if (!uniqueEmotes.has(emote.emoteName)) {
        uniqueEmotes.set(emote.emoteName, emote);
      }
    });

    const emojis = await client.application?.emojis.fetch();

    const emotesToCreate = Array.from(uniqueEmotes.values()).filter((emote) => {
      const existingEmoji = emojis?.find(
        (emoji) => emoji.name === emote.emoteName.slice(0, 32)
      );
      return !existingEmoji;
    });

    const createdEmotes = await Promise.all(
      emotesToCreate.map(async (emote) => {
        try {
          const newEmoji = await client.application?.emojis.create({
            name: emote.emoteName.slice(0, 32),
            attachment: emote.link,
          });
          return newEmoji
            ? { emoteName: emote.emoteName, emoji: newEmoji }
            : undefined;
        } catch (err: any) {
          if (err.rawError?.code === 50035) {
            const fallbackEmoji = await client.application?.emojis.create({
              name: emote.emoteName.slice(0, 32),
              attachment: emote.link.replace(/\.gif$/, ".webp"),
            });
            return fallbackEmoji
              ? { emoteName: emote.emoteName, emoji: fallbackEmoji }
              : undefined;
          }
        }
      })
    );

    const allEmotes = Array.from(uniqueEmotes.values()).map((emote) => {
      const existingEmoji = emojis?.find(
        (emoji) => emoji.name === emote.emoteName.slice(0, 32)
      );
      return existingEmoji
        ? { emoteName: emote.emoteName, emoji: existingEmoji }
        : createdEmotes.find(
            (created) => created?.emoteName === emote.emoteName
          );
    });

    return allEmotes.filter(
      (result): result is { emoteName: string; emoji: ApplicationEmoji } =>
        result !== undefined
    );
  }
}

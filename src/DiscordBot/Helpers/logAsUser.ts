import { promises } from "fs";
import { streamer, user } from "../interfaces";
import DiscordBot from "../DiscordBot";
import { TextChannel } from "discord.js";
import {
  formatMessageWithEmojis,
  getOrCreateWebhook,
  sendWebhookMessage,
} from "./helpers";
import { loadEmotes, parseMessageWithEmotes } from "./Emotes";
import { ChatMessage } from "@twurple/chat";
import getPronouns from "./pronouns";

/**
 * Logs messages as specified users to specified stream channels.
 *
 * @param users - Array of user objects containing message, user, and profilePictureUrl
 * @param streamChannel - Stream channel(s) to log to
 * @param msg - Optional Twurple ChatMessage containing emote information
 */
export async function logAsUser(
  users: user[],
  streamChannel: string[] | string,
  msg?: ChatMessage
): Promise<void> {
  const client = DiscordBot.getClient();
  if (!client) return;

  // Load channels configuration
  const channelsData = await loadChannelsData();

  // Normalize stream channels to array
  const streamChannels = Array.isArray(streamChannel)
    ? streamChannel
    : [streamChannel];

  const messagePromises: Promise<any>[] = [];

  for (const user of users) {
    for (const channelName of streamChannels) {
      const channelDetails = findChannelDetails(channelsData, channelName);
      if (!channelDetails) continue;

      // Process each guild channel only once
      const processedChannels = new Set<string>();

      for (const guildInfo of channelDetails.Guilds) {
        const channelKey = `${guildInfo.guildId}-${guildInfo.channelId}`;
        if (processedChannels.has(channelKey)) continue;
        processedChannels.add(channelKey);

        const discordChannel = getDiscordChannel(client, guildInfo);
        if (!discordChannel) continue;

        const formattedMessage = formatMessageWithEmojis(
          user.message,
          discordChannel.guild
        );

        messagePromises.push(
          sendMessageViaWebhook(
            discordChannel,
            user,
            formattedMessage,
            msg,
            channelKey
          )
        );
      }
    }
  }

  // Wait for all messages to be sent
  await Promise.all(messagePromises);
}

/**
 * Loads channels data from file
 */
async function loadChannelsData(): Promise<streamer[]> {
  return JSON.parse(await promises.readFile("./channels.json", "utf-8"));
}

/**
 * Finds channel details from channelsData
 */
function findChannelDetails(
  channelsData: streamer[],
  channelName: string
): streamer | undefined {
  return channelsData.find(
    (streamer) => streamer.channel.replace("#", "") === channelName
  );
}

/**
 * Gets Discord channel from guild and channel IDs
 */
function getDiscordChannel(
  client: any,
  guildInfo: { guildId: string; channelId: string }
): TextChannel | null {
  const discordGuild = client.guilds.cache.get(guildInfo.guildId);
  const channel = discordGuild?.channels.cache.get(guildInfo.channelId);

  return channel instanceof TextChannel ? channel : null;
}

/**
 * Sends a message via webhook
 */
async function sendMessageViaWebhook(
  channel: TextChannel,
  user: user,
  formattedMessage: string,
  msg?: ChatMessage,
  channelKey?: string
): Promise<void> {
  try {
    const webhook = await getOrCreateWebhook(
      channel,
      "Crystal Socket",
      "https://i.imgur.com/nrhRy0b.png"
    );

    if (!webhook) return;

    const emoteOffset =
      msg?.emoteOffsets instanceof Map
        ? Array.from(msg.emoteOffsets.entries())
            .map(([key, value]) => `${key}:${value.join(",")}`)
            .join("/")
        : "";

    const links = await parseMessageWithEmotes(
      formattedMessage,
      emoteOffset,
      msg?.channelId || ""
    );

    const emoteMap = await loadEmotes(links);
    let parsedMessage = formattedMessage;

    parsedMessage = await replaceEmotesWithEmojis(parsedMessage, emoteMap);

    // Get pronouns and format username
    const pronouns = await getPronouns(user.user);
    const userName = formatUsername(user.user, pronouns);

    await sendWebhookMessage(
      webhook,
      parsedMessage,
      userName,
      user.profilePictureUrl ?? "https://i.imgur.com/nrhRy0b.png"
    );
  } catch (error) {
    if (channelKey) DiscordBot.webhookCache.delete(channelKey);
  }
}

/**
 * Replaces emotes in message with Discord emojis
 */
async function replaceEmotesWithEmojis(
  message: string,
  emoteMap: any[]
): Promise<string> {
  const client = DiscordBot.getClient();
  if (!client) return message;

  let result = message;

  for (const emote of emoteMap) {
    if (!emote) continue;

    const emojis = await client.application?.emojis.fetch();
    const emojiString = emojis
      ?.find((emoji) => emoji.name === emote.emoteName.slice(0, 32))
      ?.toString();

    if (emojiString) {
      result = result.replace(
        new RegExp(`\\b${emote.emoteName}\\b`, "g"),
        emojiString
      );
    }
  }

  return result;
}

/**
 * Formats username with special cases and pronouns
 */
function formatUsername(username: string, pronouns: string): string {
  return `${
    username.toLowerCase() === "mimi_py" ? "👑Mimi_py" : username
  }${pronouns}`;
}

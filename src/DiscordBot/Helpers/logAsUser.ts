import { user } from "../interfaces";
import DiscordBot from "../DiscordBot";
import { Client, ForumChannel, TextChannel, ThreadChannel } from "discord.js";
import {
  formatMessageWithEmojis,
  getOrCreateWebhook,
  sendWebhookMessage,
} from "./helpers";
import { loadEmotes, parseMessageWithEmotes } from "./Emotes";
import { ChatMessage } from "@twurple/chat";
import getPronouns from "./pronouns";
import Helper from "../helperClass";
import { Streamer } from "../../MongoDB/models/streamer.model";

/**
 * Logs messages as specified users to specified stream channels.
 *
 * @param users - Array of user objects containing message, user, and profilePictureUrl
 * @param streamChannel - Stream channel(s) to log to
 * @param msg - Optional Twurple ChatMessage containing emote information
 * @param twitchEvent - Optional Twitch event type
 */
export async function logAsUser(
  users: user[],
  streamChannel: string[] | string,
  msg?: ChatMessage,
  twitchEvent?: string
): Promise<void> {
  const client = DiscordBot.getClient();
  if (!client) return;

  const messagePromises: Promise<any>[] = [];

  for (const user of users) {
    const channelDetails = await Streamer.findOne({ name: streamChannel });

    if (!channelDetails) continue;

    // Process each guild channel only once
    const processedChannels = new Set<string>();

    for (const guildInfo of channelDetails.guilds) {
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
          channelKey,
          twitchEvent
        )
      );
    }
  }

  // Wait for all messages to be sent
  await Promise.all(messagePromises);
}

/**
 * Gets a Discord channel from the guild and channel IDs.
 *
 * @param client - Discord client instance.
 * @param guildInfo - Object containing guildId and channelId.
 * @returns The TextChannel object or null if not found.
 */
function getDiscordChannel(
  client: Client,
  guildInfo: { guildId: string; channelId: string }
): TextChannel | ThreadChannel | null {
  const discordGuild = client.guilds.cache.get(guildInfo.guildId);
  const channel = discordGuild?.channels.cache.get(guildInfo.channelId);

  return channel instanceof TextChannel || channel instanceof ThreadChannel ? channel : null;
}

/**
 * Sends a message via a webhook to a Discord channel.
 *
 * @param channel - The Discord TextChannel to send the message to.
 * @param user - User object containing message and profile picture URL.
 * @param formattedMessage - The message to send, formatted with emojis.
 * @param msg - Optional Twurple ChatMessage containing emote information.
 * @param channelKey - Unique key for the channel (guildId-channelId).
 * @param twitchEvent - Optional Twitch event type.
 */
async function sendMessageViaWebhook(
  channel: TextChannel | ThreadChannel,
  user: user,
  formattedMessage: string,
  msg?: ChatMessage,
  channelKey?: string,
  twitchEvent?: string
): Promise<void> {
  try {
   
    const webhook = await getOrCreateWebhook(
      channel instanceof ThreadChannel ? channel.parent as ForumChannel : channel as TextChannel,
      "Crystal Socket",
      "https://i.imgur.com/nrhRy0b.png"
    );
    
    if (!webhook) return 

    
    formattedMessage = await parseMessage(channel, formattedMessage, msg);

    // Get pronouns and format username
    const pronouns = await getPronouns(user.user);
    const userName = formatUsername(user.user, pronouns);

    let continueExec = true;

    // Handle Twitch commands if the message starts with "!"
    if (formattedMessage.startsWith("!")) {
      const [command, ...args] = formattedMessage.slice(1).split(" ");

      continueExec = await Helper.handleTwitchCommands(command, args, {
        webhook,
        channel,
        user,
        userName,
        formattedMessage,
        msg,
        channelKey,
      });
    }

    if (!continueExec) return;

    // Handle Twitch events if provided
    if (twitchEvent) {
      DiscordBot.Helper.handleTwitchEvents(
        webhook,
        channel,
        userName,
        formattedMessage,
        msg,
        twitchEvent
      );
    }

    // Send the message via webhook
   
    await sendWebhookMessage(
      webhook,
      formattedMessage,
      userName,
      user.profilePictureUrl ?? "https://i.imgur.com/nrhRy0b.png",
      msg?.userInfo.isBroadcaster || msg?.userInfo.isMod || false,
      [channel.id, channel.isThread()]
    );
  } catch (error) {
    if (channelKey) DiscordBot.webhookCache.delete(channelKey);
  }
}

/**
 * Parses a message, replacing mentions and emotes with appropriate Discord formats.
 *
 * @param channel - The Discord TextChannel where the message will be sent.
 * @param formattedMessage - The message to parse.
 * @param msg - Optional Twurple ChatMessage containing emote information.
 * @returns The parsed message.
 */
async function parseMessage(
  channel: TextChannel | ThreadChannel,
  formattedMessage: string,
  msg?: ChatMessage
): Promise<string> {
  const bot = channel.guild.members.me;

  const emoteOffset =
    msg?.emoteOffsets instanceof Map
      ? Array.from(msg.emoteOffsets.entries())
          .map(([key, value]) => `${key}:${value.join(",")}`)
          .join("/")
      : "";

  // Replace mentions with Discord user mentions
  const mentions: string[] | undefined = formattedMessage
    .split(" ")
    .map((word, i, arr) => word.startsWith("!d") && arr[i + 1].slice(1))
    .filter((w) => w !== false);

  if (mentions) {
    if (
      bot &&
      channel
        .permissionsFor(bot)
        .has(["ViewChannel", "ManageChannels", "ManageMessages"])
    ) {
      try {
        for (const mention of mentions) {
          const discordId = (await channel.guild.members.list()).find(
            (member) => member.user.username === mention
          )?.id;

          if (discordId) {
            formattedMessage = formattedMessage.replace(
              `!d @${mention}`,
              `<@${discordId}>`
            );
          }
        }
      } catch (e) {
        console.error("Error during addMentions", e);
      }
    }
  }

  // Parse emotes and replace them with emojis
  const links = await parseMessageWithEmotes(
    formattedMessage,
    emoteOffset,
    msg?.channelId || ""
  );

  const emoteMap = await loadEmotes(links);

  return await replaceEmotesWithEmojis(formattedMessage, emoteMap);
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
      ?.find((emoji) => emoji.name === formatEmoteName(emote.emoteName))
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
 * Formats an emote name by replacing special characters with predefined codes.
 *
 * @param emoteName - The emote name to format.
 * @returns The formatted emote name.
 */
export function formatEmoteName(emoteName: string): string {
  const specialCharacters: Record<string, string> = {
    ":": "col",
    _: "us",
    "-": "dsh",
    "+": "pls",
    "[": "lbr",
    "]": "rbr",
    "{": "lb",
    "}": "rb",
    "(": "lp",
    ")": "rp",
    "!": "ex",
    '"': "qt",
    "'": "sq",
    "<": "lt",
    ">": "gt",
    "#": "hsh",
    $: "dlr",
    "%": "pct",
    "&": "amp",
    "@": "at",
    "^": "c",
    "*": "st",
    "/": "fs",
    "\\": "bs",
    "|": "p",
    "?": "qm",
    ";": "sc",
  };

  const escapedKeys = Object.keys(specialCharacters).map((key) =>
    key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
  );

  const regex = new RegExp(`[${escapedKeys.join("")}]`, "g");
  const formattedName = emoteName.replace(regex, (match) => {
    return specialCharacters[match] || match;
  });

  return formattedName.slice(0, 32); // Limit to 32 characters
}

/**
 * Formats a username with special cases and pronouns.
 *
 * @param username - The username to format.
 * @param pronouns - The pronouns to append.
 * @returns The formatted username.
 */
function formatUsername(username: string, pronouns: string): string {
  return `${
    username.toLowerCase() === "mimi_py" ? "👑Mimi_py" : username
  }${pronouns}`;
}

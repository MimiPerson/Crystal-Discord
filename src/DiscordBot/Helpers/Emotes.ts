import { ApplicationEmoji } from "discord.js";
import DiscordBot from "../DiscordBot";
import { formatEmoteName } from "./logAsUser";

/**
 * Fetches 7TV emotes for a given Twitch channel.
 * @param channelId - The Twitch channel ID (optional).
 * @returns A map of emote names to their URLs.
 */
export async function fetchEmotes(
  channelId?: string
): Promise<Map<string, string>> {
  const sevenTvResponse = await fetch(
    `https://7tv.io/v3/users/twitch/${channelId || ""}`
  );
  const sevenTvData = await sevenTvResponse.json();
  const sevenTvEmotes = sevenTvData.emote_set?.emotes || [];

  // Create a map for emotes
  const emoteMap = new Map<string, string>();

  // Add 7TV emotes to the map
  sevenTvEmotes.forEach((emote: any) => {
    emoteMap.set(emote.name, emote.data.host.url + "/1x");
  });

  return emoteMap;
}

/**
 * Parses a message and replaces emote names with their corresponding URLs.
 * Supports both Twitch and 7TV emotes.
 * @param message - The message to parse.
 * @param twitchEmotes - Twitch emotes string from the message metadata.
 * @param channelId - The Twitch channel ID (optional).
 * @param emoteMap - A map of emote names to URLs (optional).
 * @returns An array of emote name and URL pairs.
 */
export async function parseMessageWithEmotes(
  message: string,
  twitchEmotes: string,
  channelId?: string,
  emoteMap?: Map<string, string>
): Promise<{ emoteName: string; link: string }[]> {
  // Fetch 7TV emotes if not provided
  emoteMap = emoteMap || (await fetchEmotes(channelId));
  const emoteLinkMap: { emoteName: string; link: string }[] = [];

  // Process Twitch emotes
  if (twitchEmotes) {
    twitchEmotes.split("/").forEach((emote) => {
      const [emoteId, range] = emote.split(":");
      const ranges = range.split(",");
      ranges.forEach((emoteRange) => {
        const [start, end] = emoteRange.split("-");
        const emoteName = message.slice(
          parseInt(start, 10),
          parseInt(end, 10) + 1
        );
        emoteLinkMap.push({
          emoteName,
          link: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/3.0`,
        });
      });
    });
  }

  // Process 7TV emotes
  if (emoteMap) {
    message.split(" ").forEach((word) => {
      if (emoteMap.has(word)) {
        const emoteUrl = emoteMap.get(word);
        emoteLinkMap.push({
          emoteName: word,
          link: `https:${emoteUrl}.gif`,
        });
      }
    });
  }

  return emoteLinkMap;
}

/**
 * Loads emotes into the Discord bot's application emojis.
 * @param emoteMap - An array of emote name and URL pairs.
 * @returns An array of successfully loaded emotes with their corresponding Discord emojis.
 */
export async function loadEmotes(
  emoteMap: { emoteName: string; link: string }[]
): Promise<{ emoteName: string; emoji: ApplicationEmoji }[]> {
  const client = DiscordBot.getClient();
  if (!client) return [];

  // Create a map of unique emotes to avoid duplicates
  const uniqueEmotes = new Map<string, { emoteName: string; link: string }>();
  emoteMap.forEach((emote) => {
    if (!uniqueEmotes.has(formatEmoteName(emote.emoteName))) {
      uniqueEmotes.set(formatEmoteName(emote.emoteName), emote);
    }
  });

  const emojis = await client.application?.emojis.fetch();

  // Filter emotes that need to be created
  const emotesToCreate = Array.from(uniqueEmotes.values()).filter((emote) => {
    const existingEmoji = emojis?.find(
      (emoji) => emoji.name === formatEmoteName(emote.emoteName)
    );
    return !existingEmoji;
  });

  // Create new emojis
  const createdEmotes = await Promise.all(
    emotesToCreate.map(async (emote) => {
      try {
        const newEmoji = await client.application?.emojis.create({
          name: formatEmoteName(emote.emoteName),
          attachment: emote.link,
        });
        return newEmoji
          ? { emoteName: emote.emoteName, emoji: newEmoji }
          : undefined;
      } catch (err: any) {
        // Handle specific error codes and fallback to alternative formats
        if (err.rawError?.code === 50035) {
          const fallbackEmoji = await client.application?.emojis.create({
            name: formatEmoteName(emote.emoteName),
            attachment: emote.link.replace(/\.gif$/, ".webp"),
          });
          return fallbackEmoji
            ? { emoteName: emote.emoteName, emoji: fallbackEmoji }
            : undefined;
        }
        if (err.rawError?.code === 50138) {
          const fallbackEmoji = await client.application?.emojis.create({
            name: formatEmoteName(emote.emoteName),
            attachment: emote.link.replace(/3\.0$/, "2.0"),
          });
          return fallbackEmoji
            ? { emoteName: emote.emoteName, emoji: fallbackEmoji }
            : undefined;
        }
      }
    })
  );

  // Combine existing and newly created emojis
  const allEmotes = Array.from(uniqueEmotes.values()).map((emote) => {
    const existingEmoji = emojis?.find(
      (emoji) => emoji.name === emote.emoteName.slice(0, 32)
    );
    return existingEmoji
      ? { emoteName: emote.emoteName, emoji: existingEmoji }
      : createdEmotes.find(
          (created) => created?.emoteName === formatEmoteName(emote.emoteName)
        );
  });

  // Filter out undefined results and return the final list
  return allEmotes.filter(
    (result): result is { emoteName: string; emoji: ApplicationEmoji } =>
      result !== undefined
  );
}

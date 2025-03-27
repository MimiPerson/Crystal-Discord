import { ApplicationEmoji } from "discord.js";
import DiscordBot from "../DiscordBot";

// Fetch 7TV Emotes
export async function fetchEmotes(channelId?: string) {
  const sevenTvResponse = await fetch(
    `https://7tv.io/v3/users/twitch/${channelId || ""}`
  );
  const sevenTvData = await sevenTvResponse.json();
  const sevenTvEmotes = sevenTvData.emote_set?.emotes || [];

  // Create a map for emotes
  const emoteMap = new Map();

  // Add 7TV Emotes
  sevenTvEmotes.forEach((emote: any) => {
    emoteMap.set(emote.name, emote.data.host.url + "/1x");
  });

  return emoteMap;
}

// Parse message with emotes from both 7TV and Twitch
export async function parseMessageWithEmotes(
  message: string,
  twitchEmotes: string,
  channelId?: string,
  emoteMap?: Map<any, any>
) {
  emoteMap = await fetchEmotes(channelId);
  const emoteLinkMap: { emoteName: string; link: string }[] = [];

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
          emoteName: emoteName,
          link: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/3.0`,
        });
      });
    });
  }
  if (emoteMap) {
    // Now process 7TV emotes
    message
      .split(" ")
      .map((word) => {
        if (emoteMap.has(word)) {
          const emoteUrl = emoteMap.get(word);
          emoteLinkMap.push({
            emoteName: word,
            link: `https:${emoteUrl}.gif`,
          });
        }
      })
      .join(" ");
  }

  return emoteLinkMap;
}

export async function loadEmotes(
  emoteMap: { emoteName: string; link: string }[]
) {
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
        if (err.rawError?.code === 50138) {
          const fallbackEmoji = await client.application?.emojis.create({
            name: emote.emoteName.slice(0, 32),
            attachment: emote.link.replace(/3\.0$/, "2.0"),
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
      : createdEmotes.find((created) => created?.emoteName === emote.emoteName);
  });

  return allEmotes.filter(
    (result): result is { emoteName: string; emoji: ApplicationEmoji } =>
      result !== undefined
  );
}

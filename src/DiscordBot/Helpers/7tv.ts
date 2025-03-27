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

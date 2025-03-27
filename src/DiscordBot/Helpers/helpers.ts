import {
  ActivityType,
  CacheType,
  CommandInteraction,
  EmbedBuilder,
  TextChannel,
  Webhook,
} from "discord.js";
import { streamer } from "../interfaces";
import { promises } from "fs";
import DiscordBot from "../DiscordBot";

// Helper functions
function formatMessageWithEmojis(message: string, guild: any) {
  return message.replace(/:(\w+):/g, (match, emojiName) => {
    const emoji = guild.emojis.cache.find((e: any) => e.name === emojiName);
    return emoji ? emoji.toString() : match;
  });
}

// Set bot activity
function setActivity() {
  DiscordBot.getClient().user?.setActivity({
    name: "Watching My creator",
    type: ActivityType.Streaming,
    url: "https://www.twitch.tv/mimi_py",
  });
}

async function getOrCreateWebhook(
  channel: TextChannel,
  username: string,
  avatarUrl: string
): Promise<Webhook | null> {
  const webhooks = await channel.fetchWebhooks();
  return (
    webhooks.find((wh) => wh.channelId === channel.id) ||
    (await channel.createWebhook({
      name: username,
      avatar: avatarUrl,
    }))
  );
}
const noteList = ["mimi_py", "alyxolotl"];
let messageCache: [string, Date] = ["", new Date(0)];
async function sendWebhookMessage(
  webhook: Webhook | null,
  content: string,
  username: string,
  avatarUrl: string,
  streamer: boolean
) {
  if (messageCache[0] === content && messageCache[1] > new Date(Date.now() - 5))
    return;
  messageCache = [content, new Date()];

  if (content.toLowerCase().startsWith("!addnote") && streamer) {
    const embed = new EmbedBuilder()

      .setDescription(`${content.replace("!addnote", "")} \n`)

      .setColor("#00b0f4");

    return webhook
      ?.send({
        content: "Note added:",
        embeds: [embed],
        username: "📝",
        avatarURL: avatarUrl,
        allowedMentions: { parse: [] },
      })
      .then((message) => {
        message.pin("Note pinned by bot");
      });
  }

  await webhook?.send({
    content,
    username,
    avatarURL: avatarUrl,
    allowedMentions: { parse: [] },
  });
}

async function handleListStreamers(interaction: CommandInteraction<CacheType>) {
  const channelsData: streamer[] = JSON.parse(
    await promises.readFile("./channels.json", "utf-8")
  );

  const streamerList = channelsData
    .filter((streamer) =>
      streamer.Guilds.some((guild) => guild.guildId === interaction.guildId)
    )
    .map((streamer) => streamer.channel);

  const response =
    streamerList.length > 0
      ? `Currently monitored streamers:\n${streamerList.join(", ")}`
      : "No streamers are currently monitored.";

  interaction.reply({
    content: response,
    flags: 64,
  });
}

export {
  formatMessageWithEmojis,
  getOrCreateWebhook,
  sendWebhookMessage,
  handleListStreamers,
  setActivity,
};

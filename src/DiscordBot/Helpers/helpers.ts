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

/**
 * Replaces emoji placeholders (e.g., :emojiName:) in a message with actual emojis from the guild.
 * @param message - The message containing emoji placeholders.
 * @param guild - The guild object to search for emojis.
 * @returns The formatted message with emojis replaced.
 */
function formatMessageWithEmojis(message: string, guild: any): string {
  return message.replace(/:(\w+):/g, (match, emojiName) => {
    const emoji = guild.emojis.cache.find((e: any) => e.name === emojiName);
    return emoji ? emoji.toString() : match;
  });
}

/**
 * Sets the bot's activity to "Streaming" with a predefined message and URL.
 */
function setActivity(): void {
  DiscordBot.getClient().user?.setActivity({
    name: "Watching My creator",
    type: ActivityType.Streaming,
    url: "https://www.twitch.tv/mimi_py",
  });
}

/**
 * Fetches an existing webhook for a channel or creates a new one if none exists.
 * @param channel - The text channel to fetch or create the webhook for.
 * @param username - The username for the webhook.
 * @param avatarUrl - The avatar URL for the webhook.
 * @returns The existing or newly created webhook.
 */
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

// Cache to prevent duplicate messages being sent within a short time frame.
let messageCache: [string, Date] = ["", new Date(0)];

/**
 * Sends a message using a webhook, ensuring duplicate messages are not sent within 5 seconds.
 * @param webhook - The webhook to send the message through.
 * @param content - The content of the message.
 * @param username - The username to display for the webhook.
 * @param avatarUrl - The avatar URL to display for the webhook.
 * @param permission - Whether the webhook has permission to send the message.
 */
async function sendWebhookMessage(
  webhook: Webhook | null,
  content: string,
  username: string,
  avatarUrl: string,
  permission: boolean
): Promise<void> {
  if (
    messageCache[0] === content &&
    messageCache[1] > new Date(Date.now() - 5000)
  ) {
    return; // Prevent duplicate messages within 5 seconds.
  }
  messageCache = [content, new Date()];

  await webhook?.send({
    content,
    username,
    avatarURL: avatarUrl,
    allowedMentions: { parse: ["users"] },
    flags: ["SuppressNotifications"],
  });
}

/**
 * Handles the "list streamers" command, providing a list of monitored streamers for the guild.
 * @param interaction - The command interaction object.
 */
async function handleListStreamers(
  interaction: CommandInteraction<CacheType>
): Promise<void> {
  // Read and parse the list of streamers from the channels.json file.
  const channelsData: streamer[] = JSON.parse(
    await promises.readFile("./channels.json", "utf-8")
  );

  // Filter streamers monitored in the current guild.
  const streamerList = channelsData
    .filter((streamer) =>
      streamer.Guilds.some((guild) => guild.guildId === interaction.guildId)
    )
    .map((streamer) => streamer.channel);

  // Generate a response based on the list of streamers.
  const response =
    streamerList.length > 0
      ? `Currently monitored streamers:\n${streamerList.join(", ")}`
      : "No streamers are currently monitored.";

  // Reply to the interaction with the response.
  interaction.reply({
    content: response,
    flags: 64, // Ephemeral message (only visible to the user).
  });
}

// Exporting helper functions for use in other modules.
export {
  formatMessageWithEmojis,
  getOrCreateWebhook,
  sendWebhookMessage,
  handleListStreamers,
  setActivity,
};

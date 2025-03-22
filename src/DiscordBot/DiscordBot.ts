import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Message,
  TextChannel,
  Webhook,
} from "discord.js";
import config from "../config";
import { user } from "./interfaces";

// Constants
const BOT_TOKEN = config.token;
const CHANNEL_ID = "1352682099085414470";
const GUILD_ID = "1173586671451770880";

// Initialize Discord client
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Event handlers
client.once("ready", async () => {});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
});

// Bot login and activity setup
client
  .login(BOT_TOKEN)
  .then(() => {
    client.user?.setActivity({
      name: "Watching My creator",
      type: ActivityType.Streaming,
      url: "https://www.twitch.tv/mimi_py",
    });
  })
  .catch((err) => {
    console.error("Failed to login:", err);
  });

/**
 * Sends a message as a webhook with custom user data
 * @param userData User data containing message and profile information
 */
export async function LogAsUser(users: user[]) {
  for (const user of users) {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = (await guild.channels.fetch(CHANNEL_ID)) as TextChannel;
    const formattedMessage = formatMessageWithEmojis(user.message, guild);
    const webhook = await getOrCreateWebhook(
      channel,
      "Crystal Socket",
      "https://i.imgur.com/nrhRy0b.png"
    );
    await sendWebhookMessage(
      webhook,
      formattedMessage,
      user.user,
      user.profilePictureUrl!
    );
  }
}

// Helper functions
function formatMessageWithEmojis(message: string, guild: any) {
  return message.replace(/:(\w+):/g, (match, emojiName) => {
    const emoji = guild.emojis.cache.find((e: any) => e.name === emojiName);
    return emoji ? emoji.toString() : match;
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

async function sendWebhookMessage(
  webhook: Webhook | null,
  content: string,
  username: string,
  avatarUrl: string
) {
  await webhook?.send({
    content,
    username,
    avatarURL: avatarUrl,
    allowedMentions: { parse: [] },
  });
}

import { TextChannel, Webhook } from "discord.js";

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

export { formatMessageWithEmojis, getOrCreateWebhook, sendWebhookMessage };

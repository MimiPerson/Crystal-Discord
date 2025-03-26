import { TextChannel, Webhook } from "discord.js";
import DiscordBot from "../DiscordBot";
const webhookCache = DiscordBot.webhookCache;

async function cleanupDuplicateWebhooks(
  channel: TextChannel,
  name: string
): Promise<void> {
  try {
    const webhooks = await channel.fetchWebhooks();
    const matchingWebhooks = webhooks.filter((wh) => wh.name === name);

    if (matchingWebhooks.size > 1) {
      console.log(
        `Found ${matchingWebhooks.size} duplicate webhooks in ${channel.name}. Cleaning up...`
      );
      // Keep the oldest webhook and delete the rest
      const sortedWebhooks = Array.from(matchingWebhooks.values()).sort(
        (a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0)
      );

      const [keepWebhook, ...duplicates] = sortedWebhooks;
      await Promise.all(
        duplicates.map((wh) =>
          wh
            .delete("Removing duplicate webhook")
            .catch((err) => console.error(`Failed to delete webhook: ${err}`))
        )
      );

      // Update cache with the kept webhook
      webhookCache.set(`${channel.guildId}-${channel.id}`, keepWebhook);
    }
  } catch (error) {
    console.error("Error cleaning up webhooks:", error);
  }
}

async function getOrCreateWebhook(
  channel: TextChannel,
  name: string,
  avatar: string
): Promise<Webhook | null> {
  const cacheKey = `${channel.guildId}-${channel.id}`;

  // Check cache first
  if (webhookCache.has(cacheKey)) {
    return webhookCache.get(cacheKey)!;
  }

  try {
    // Clean up any duplicate webhooks first
    await cleanupDuplicateWebhooks(channel, name);

    // Find existing webhooks
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find((wh) => wh.name === name);

    if (!webhook) {
      // Create new webhook if none exists
      webhook = await channel.createWebhook({
        name: name,
        avatar: avatar,
        reason: "Created for Crystal Socket logging",
      });
    }

    // Cache the webhook
    DiscordBot.webhookCache.set(cacheKey, webhook);
    return webhook;
  } catch (error) {
    console.error("Webhook error:", error);
    // Remove from cache if there was an error
    DiscordBot.webhookCache.delete(cacheKey);
    return null;
  }
}

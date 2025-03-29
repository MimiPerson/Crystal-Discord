import { ChatMessage } from "@twurple/chat";
import { TextChannel, Webhook } from "discord.js";

/**
 * Handles Twitch events and updates Discord messages accordingly.
 *
 * @param webhook - The Discord webhook used to edit messages.
 * @param channel - The Discord text channel where messages are fetched.
 * @param user - The username of the Twitch user associated with the event.
 * @param formattedMessage - A formatted message to be used if needed.
 * @param msg - The Twitch chat message object (optional).
 * @param twitchEvent - The type of Twitch event (e.g., "onBan", "onUnban").
 */
function handleTwitchEvents(
  webhook: Webhook,
  channel: TextChannel,
  user: string,
  formattedMessage: string,
  msg?: ChatMessage,
  twitchEvent?: string
) {
  switch (twitchEvent) {
    case "onBan":
      // Handle the "onBan" event: Mark messages from the banned user as "BANNED"
      channel.messages.fetch().then(async (msgs) => {
        const latestMessage = msgs.first();

        // Filter messages by the banned user's username
        const userMessages = msgs.filter((msg) => msg.author.username === user);

        // Update each message, except the latest one, to indicate it is banned
        for (const msg of userMessages.values()) {
          if (msg.id === latestMessage?.id) continue;

          const messageContent = msg.content.startsWith("BANNED:")
            ? msg.content
            : `BANNED: ||${msg.content}||`;

          await webhook.editMessage(msg.id, {
            content: messageContent,
            flags: ["SuppressEmbeds"], // Suppress embeds for the edited message
          });
        }
      });
      break;

    case "onUnban":
      // Handle the "onUnban" event: Restore messages from the unbanned user
      channel.messages.fetch().then((msgs) => {
        // Filter messages by the unbanned user's username
        const userMessages = msgs.filter((msg) => msg.author.username === user);

        // Update each message to remove the "BANNED" prefix
        userMessages.forEach((msg) => {
          const messageContent = msg.content.startsWith("BANNED:")
            ? msg.content.replace(/BANNED: \|\|/g, "").slice(0, -2) // Remove "BANNED: ||...||"
            : msg.content;

          webhook.editMessage(msg.id, {
            content: messageContent,
            flags: [], // Clear any flags
          });
        });
      });
      break;

    default:
      // Handle unsupported or undefined events
      console.warn(`Unhandled Twitch event: ${twitchEvent}`);
      break;
  }
}

export default handleTwitchEvents;

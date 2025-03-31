import { EmbedBuilder, Message, TextChannel, Webhook } from "discord.js";
import { user } from "../interfaces";
import { ChatMessage } from "@twurple/chat";

/**
 * Handles Twitch commands and performs actions based on the command provided.
 *
 * @param command - The command to execute (e.g., "addnote", "vanish").
 * @param args - Additional arguments for the command.
 * @param forwarded - An object containing relevant data for command execution.
 * @returns A promise that resolves to a boolean indicating whether the command was handled.
 */
export async function handleTwitchCommands(
  command: string,
  args: string[],
  forwarded: {
    webhook: Webhook;
    channel: TextChannel;
    user: user;
    userName: string;
    formattedMessage: string;
    msg?: ChatMessage;
    channelKey?: string;
    twitchEvent?: string;
  }
): Promise<boolean> {
  switch (command) {
    case "addnote":
      // Check if the user has permission (broadcaster or moderator).
      const hasPermission =
        forwarded.msg?.userInfo.isBroadcaster || forwarded.msg?.userInfo.isMod;

      if (hasPermission) {
        // Create an embed message for the note.
        const embed = new EmbedBuilder()
          .setDescription(
            `${forwarded.formattedMessage.replace("!addnote", "")} \n`
          )
          .setColor("#00b0f4");

        // Send the note via webhook and pin the message.
        forwarded.webhook
          ?.send({
            content: "Note added:",
            embeds: [embed],
            username: "📝",
            avatarURL:
              forwarded.user.profilePictureUrl ??
              "https://i.imgur.com/nrhRy0b.png",
            allowedMentions: { parse: [] },
          })
          .then((message) => {
            message.pin("Note pinned by bot");
          });

        return false; // Command handled.
      }
      break;

    case "vanish":
      try {
        // Fetch messages from the channel and filter by the user's username.
        const messagesToDelete = await forwarded.channel.messages
          .fetch()
          .then((msgs) =>
            msgs.filter(
              (msg: Message) => msg.author.username === forwarded.userName
            )
          );

        // Bulk delete the filtered messages.
        (forwarded.webhook.channel as TextChannel)
          .bulkDelete(messagesToDelete, true)
          .catch((reason) => {
            console.error("Failed to delete messages:", reason);
          });

        return false; // Command handled.
      } catch (error) {
        console.error("Error handling 'vanish' command:", error);
      }
      break;

    default:
      // Command not recognized, return true to indicate it wasn't handled.
      return true;
  }

  return true; // Default return for unhandled commands.
}

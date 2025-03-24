import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Interaction,
  Message,
  Options,
  TextChannel,
  Webhook,
} from "discord.js";
import config from "../config";
import { user } from "./interfaces";
import {
  formatMessageWithEmojis,
  getOrCreateWebhook,
  sendWebhookMessage,
} from "./Helpers/helpers";
import TwitchClient from "../Twitch/TwitchWebsocket";
import { get } from "http";

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
    client.guilds.cache.get(GUILD_ID)?.commands.set([
      // raid command
      {
        name: "raid",
        description: "Raid the channel",
        defaultMemberPermissions: "Administrator",
        type: 1, // Slash command

        options: [
          {
            name: "channel",
            description: "Channel to raid",
            type: 3, // String
            required: true,
          },
        ],
      },
      // unraid command
      {
        name: "unraid",
        description: "Stop the raid",
        defaultMemberPermissions: "Administrator",
        type: 1, // Slash command
      },
      // clearchat command
      {
        name: "clearchat",
        description: "Clear the chat",
        defaultMemberPermissions: "Administrator",
        type: 1, // Slash command

        options: [
          {
            name: "cleartwitch",
            description: "Clear Twitch",
            type: 3,
            required: true,
            choices: [
              {
                name: "Yes",
                value: "y",
              },
              {
                name: "No",
                value: "n",
              },
            ],
          },
        ],
      },
    ]);
    client.user?.setActivity({
      name: "Watching My creator",
      type: ActivityType.Streaming,
      url: "https://www.twitch.tv/mimi_py",
    });
  })
  .catch((err) => {
    console.error("Failed to login:", err);
  });

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  switch (commandName) {
    case "raid":
      handleRaid(interaction, options);
      break;
    case "unraid":
      handleUnraid(interaction);
      break;
    case "clearchat":
      handleClearChat(interaction, options);
      break;
  }
});

client.on("messageCreate", async (message: Message) => {
  if (
    message.author.bot ||
    message.channelId != "1352682099085414470" ||
    message.webhookId
  )
    return;

  if (message.author.id == "297656504842977291") {
    TwitchClient.sendMessage("#mimi_py", "106904180", message.content);
    message.delete();
  }
});

async function handleRaid(interaction: Interaction, options: any) {
  if (!interaction.isCommand()) return;

  await TwitchClient.raidChannel(options.data[0].value as string).then(
    async (response) => {
      if (typeof response === "string") {
        return await interaction.reply({
          content: response,
          flags: 64,
        });
      }
      if (response) {
        return interaction.reply({
          content: `Raid started on ${options.data[0].value}`,
          flags: 64,
        });
      }
      return await interaction.reply({
        content: `Raid failed on ${options.data[0].value}`,
        flags: 64,
      });
    }
  );
}
async function handleUnraid(interaction: Interaction) {
  if (!interaction.isCommand()) return;

  await TwitchClient.unraidChannel().then(async (response) => {
    if (response) {
      return interaction.reply({
        content: `Raid has been stopped`,
        flags: 64,
      });
    }
    return await interaction.reply({
      content: `failed to stop raid`,
      flags: 64,
    });
  });
}
async function handleClearChat(interaction: Interaction, options: any) {
  if (!interaction.isCommand()) return;
  const guild = await client.guilds.fetch(GUILD_ID);
  const channel = (await guild.channels.fetch(CHANNEL_ID)) as TextChannel;

  channel.bulkDelete(25, true).catch((err) => {
    interaction.reply({
      content: `Failed to delete discord messages`,
      flags: 64,
    });
  });
  const wipeTwitchChat = (options.data[0].value as string) === "y";
  if (wipeTwitchChat) {
    await TwitchClient.clearChat().catch((err) => {
      interaction.reply({
        content: `Failed to delete twitch messages`,
        flags: 64,
      });
    });
  }
  await interaction.reply({
    content: `Chat has been cleared`,
    flags: 64,
  });
}

/**
 * Sends a message as a webhook with custom user data
 * @param userData User data containing message and profile information
 */
async function logAsUser(users: user[]): Promise<void> {
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

async function setStreamActive(live: boolean): Promise<void> {
  const guild = await client.guilds.fetch(GUILD_ID);
  const channel = (await guild.channels.fetch(CHANNEL_ID)) as TextChannel;
  channel
    .edit({
      name: live ? "🔴Stream Logs" : "🔵Stream Logs",
    })
    .then(() => {
      console.log("Channel name updated successfully.");
    })
    .catch((error) => {
      console.error("Error updating channel name:", error);
    });
}

/**
 * Singleton class for the Discord bot
 * @class DiscordBot
 * @description This class provides a singleton instance of the Discord bot
 *
 */

class DiscordBot {
  private static instance: DiscordBot;
  public static readonly setStreamActive = setStreamActive;

  private constructor() {}

  public static getInstance(): DiscordBot {
    if (!DiscordBot.instance) {
      DiscordBot.instance = new DiscordBot();
    }
    return DiscordBot.instance;
  }

  public static async logAsUser(users: user[]): Promise<void> {
    await logAsUser(users);
  }
}

export default DiscordBot;

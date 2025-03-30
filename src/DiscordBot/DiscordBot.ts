import {
  ApplicationEmoji,
  Client,
  GatewayIntentBits,
  Webhook,
} from "discord.js";
import config from "../config";

import { writeFile } from "fs/promises";
import Helper from "./helperClass";
import { MongoDB } from "../MongoDB/MongoDB";
import { Streamer } from "../MongoDB/models/streamer.model";

// Constants
const BOT_TOKEN = config.token; // Bot token from configuration
const webhookCache = new Map<string, Webhook>(); // Cache for webhooks

// Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Bot login and setup
client
  .login(BOT_TOKEN)
  .then(async () => {
    // Register commands and set bot activity
    await Helper.registerCommands();
    Helper.setActivity();

    // Collect guild information and save it to a JSON file

    const guilds = client.guilds.cache.map((guild) => ({
      name: guild.name,
      members: guild.memberCount,
    }));

    await writeFile("./guilds.json", JSON.stringify(guilds, null, 4), "utf-8");
  })
  .catch((err) => {
    console.error("Failed to login:", err);
  });

// Automatically delete messages that reply to pinned bot messages
client.on("messageCreate", async (message) => {
  if (
    message.reference &&
    (await message.fetchReference()).pinned &&
    (await message.fetchReference()).author.bot
  ) {
    message.delete();
  }
});

// Handle new guilds the bot joins
client.addListener("guildCreate", async (guild) => {
  const MAX_RETRIES = 5; // Maximum number of retries
  const RETRY_DELAY = 5000; // Delay between retries in milliseconds
  let retryCount = 0;

  const rerun = async () => {
    try {
      await Helper.registerCommands();

      // Wait for commands to be cached
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const commands = await guild.commands.fetch();

      // Retry if commands are not cached
      if (commands.size === 0 && retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(rerun, RETRY_DELAY);
        return;
      }
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(rerun, RETRY_DELAY);
      }
    }
  };

  await rerun();
  Helper.setActivity();
});

// Handle interactions (commands and autocomplete)
client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    // Handle autocomplete for "removestreamer" command
    if (interaction.commandName === "removestreamer") {
      const focusedValue = interaction.options.getFocused();
      const streamerOption = interaction.options.get("streamer");
      const channelOption = interaction.options.get("channel");

      if (streamerOption?.focused) {
        const streamerNames = await Helper.getStreamerChoices(
          interaction.guildId!
        );

        const filtered = streamerNames.filter((choice) =>
          choice.name.toLowerCase().startsWith(focusedValue.toLowerCase())
        );
        await interaction.respond(filtered);
      }

      if (channelOption?.focused) {
        await MongoDB.getInstance();
        const channelsData = await Streamer.find();

        const channelList = channelsData
          .filter((streamer) =>
            streamer.guilds.some(
              (guild) => guild.guildId === interaction.guildId
            )
          )
          .flatMap((streamer) =>
            streamer.guilds
              .map(
                (guild) =>
                  interaction.guild?.channels.cache.get(guild.channelId)?.name
              )
              .filter((name): name is string => name !== undefined)
          );

        const filtered = channelList.filter((choice) =>
          choice?.startsWith(focusedValue.toLowerCase())
        );

        await interaction.respond(
          filtered.map((choice) => ({ name: choice, value: choice }))
        );
      }
    }
  }

  if (interaction.isCommand()) {
    // Handle commands
    const { commandName, options } = interaction;

    switch (commandName) {
      case "addstreamer":
        await Helper.handleAddStreamer(interaction, options);
        break;
      case "removestreamer":
        await Helper.handleRemoveStreamer(interaction, options);
        break;
      case "streamers":
        await Helper.handleListStreamers(interaction);
        break;
      case "raid":
        Helper.handleRaid(interaction, options);
        break;
      case "unraid":
        Helper.handleUnraid(interaction);
        break;
      case "clearchat":
        Helper.handleClearChat(interaction, options);
        break;
    }
  }
});

/**
 * Discord bot singleton class
 * Provides access to the bot client and helper methods
 */
class DiscordBot {
  private static instance: DiscordBot;

  public static readonly webhookCache = webhookCache;
  public static readonly logAsUser = Helper.logAsUser;
  public static readonly setStreamersOnline = Helper.setStreamersOnline;
  public static readonly Helper = Helper;

  private constructor() {}

  /**
   * Get the Discord client instance
   */
  public static getClient(): Client {
    return client;
  }

  /**
   * Get the singleton instance of the DiscordBot class
   */
  public static getInstance(): DiscordBot {
    if (!DiscordBot.instance) {
      DiscordBot.instance = new DiscordBot();
    }
    return DiscordBot.instance;
  }
}

export default DiscordBot;

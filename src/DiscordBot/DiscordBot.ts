import {
  ApplicationEmoji,
  Client,
  GatewayIntentBits,
  Webhook,
} from "discord.js";
import config from "../config";
import { streamer } from "./interfaces";
import { promises } from "fs";
import { writeFile } from "fs/promises";
import Helper from "./helperClass";

// Constants
const BOT_TOKEN = config.token;

const webhookCache = new Map<string, Webhook>();

// Initialize Discord client
export const client = new Client({
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
    await Helper.registerCommands();
    Helper.registerCommands();
    Helper.setActivity();
    const guilds: { name?: string; members?: number; TotalGuilds?: number }[] =
      await client.guilds.cache.map((guild) => ({
        name: guild.name,
        members: guild.memberCount,
      }));
    await guilds.unshift({
      TotalGuilds: client.guilds.cache.size,
    });

    writeFile("./guilds.json", JSON.stringify(guilds, null, 4), "utf-8");
  })
  .catch((err) => {
    console.error("Failed to login:", err);
  });
client.on("messageCreate", async (message) => {
  if (message.reference && (await message.fetchReference()).pinned)
    message.delete();
});

client.addListener("guildCreate", async (guild) => {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 5000; // 5 seconds
  let retryCount = 0;

  const rerun = async () => {
    try {
      await Helper.registerCommands();

      // Wait for commands to be cached
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const commands = await guild.commands.fetch();

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

// Command handler
client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
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
        const channelsData: streamer[] = JSON.parse(
          await promises.readFile("./channels.json", "utf-8")
        );
        const channelList = channelsData
          .filter((streamer) =>
            streamer.Guilds.some(
              (guild) => guild.guildId === interaction.guildId
            )
          )
          .flatMap((streamer) =>
            streamer.Guilds.map(
              (guild) =>
                interaction.guild?.channels.cache.get(guild.channelId)?.name
            ).filter((name): name is string => name !== undefined)
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
 */
class DiscordBot {
  private static instance: DiscordBot;
  public static readonly webhookCache = webhookCache;
  public static readonly logAsUser = Helper.logAsUser;
  public static readonly setStreamersOnline = Helper.setStreamersOnline;
  private constructor() {}

  public static getClient(): Client {
    return client;
  }
  public static getInstance(): DiscordBot {
    if (!DiscordBot.instance) {
      DiscordBot.instance = new DiscordBot();
    }
    return DiscordBot.instance;
  }
}

export default DiscordBot;

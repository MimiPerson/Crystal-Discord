import {
  ActivityType,
  ApplicationCommandDataResolvable,
  CacheType,
  Client,
  CommandInteraction,
  GatewayIntentBits,
  Interaction,
  Message,
  Options,
  TextBasedChannel,
  TextChannel,
  Webhook,
} from "discord.js";
import config from "../config";
import { streamer, user } from "./interfaces";
import { formatMessageWithEmojis, sendWebhookMessage } from "./Helpers/helpers";
import TwitchClient, { initializeClients } from "../Twitch/TwitchWebsocket";
import { promises as fs } from "fs";
import { channel } from "diagnostics_channel";

// Constants
const BOT_TOKEN = config.token;

// Initialize Discord client
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Add this function to cache webhooks
const webhookCache = new Map<string, Webhook>();

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
    webhookCache.set(cacheKey, webhook);
    return webhook;
  } catch (error) {
    console.error("Webhook error:", error);
    // Remove from cache if there was an error
    webhookCache.delete(cacheKey);
    return null;
  }
}

// Bot login and setup
client
  .login(BOT_TOKEN)
  .then(async () => {
    await registerCommands();
    setActivity();
  })
  .catch((err) => {
    console.error("Failed to login:", err);
  });

client.addListener("guildCreate", async (guild) => {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 5000; // 5 seconds
  let retryCount = 0;

  const rerun = async () => {
    try {
      await registerCommands();

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
  setActivity();
});

async function getStreamerChoices(guildId: string) {
  const channelsData: streamer[] = JSON.parse(
    await fs.readFile("./channels.json", "utf-8")
  );

  const streamerList = channelsData
    .filter((streamer) =>
      streamer.Guilds.some((guild) => guild.guildId === guildId)
    )
    .map((streamer) => streamer.channel);
  const choices = await streamerList.map((streamer) => ({
    name: streamer.replace("#", ""),
    value: streamer,
  }));
  return choices;
}
// Register slash commands
async function registerCommands(): Promise<void> {
  const updatePromises = Array.from(client.guilds.cache.values()).map(
    async (guild) => {
      if (!guild) return;
      try {
        const streamerNames = await getStreamerChoices(guild.id);
        const commands: ApplicationCommandDataResolvable[] = [
          {
            name: "addstreamer",
            description: "Monitor target stream",
            defaultMemberPermissions: "Administrator",
            options: [
              {
                name: "streamer",
                description: "Streamer to monitor",
                type: 3, // String type
                required: true,
              },
              {
                name: "channel",
                description: "Channel to log to",
                type: 7, // Channel type
                required: true,
                channel_types: [0], // Text channels only
              },
            ],
          },

          {
            name: "streamers",
            description: "List all monitored streamers",
            defaultMemberPermissions: "Administrator",
          },
        ];
        // Add remove streamer command if there are any streamers
        if (streamerNames.length > 0) {
          commands.push({
            name: "removestreamer",
            description: "Stop monitoring target stream in channel",
            defaultMemberPermissions: "Administrator",

            options: [
              {
                name: "streamer",
                description: "Streamer to stop monitoring",
                type: 3,
                required: true,
                autocomplete: true,
              },
              {
                name: "channel",
                description: "Channel to stop logging to",
                type: 3,
                required: true,
                autocomplete: true,
              },
            ],
          });
        }

        //if home guild
        if (guild.id === "1173586671451770880") {
          commands.push(
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
            }
          );
        }

        // Use set method to handle command updates in one API call

        await guild.commands.set(commands);
      } catch (error) {
        console.log("Failed to register commands:", error);
      }
    }
  );

  // Wait for all command updates to complete
  await Promise.all(updatePromises);
  return;
}

// Set bot activity
function setActivity() {
  client.user?.setActivity({
    name: "Watching My creator",
    type: ActivityType.Streaming,
    url: "https://www.twitch.tv/mimi_py",
  });
}

// Command handler
client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === "removestreamer") {
      const focusedValue = interaction.options.getFocused();
      const streamerOption = interaction.options.get("streamer");
      const channelOption = interaction.options.get("channel");
      if (streamerOption?.focused) {
        const streamerNames = await getStreamerChoices(interaction.guildId!);

        const filtered = streamerNames.filter((choice) =>
          choice.name.toLowerCase().startsWith(focusedValue.toLowerCase())
        );
        await interaction.respond(filtered);
      }
      if (channelOption?.focused) {
        const channelsData: streamer[] = JSON.parse(
          await fs.readFile("./channels.json", "utf-8")
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
        await handleAddStreamer(interaction, options);
        break;
      case "removestreamer":
        await handleRemoveStreamer(interaction, options);
        break;
      case "streamers":
        await handleListStreamers(interaction);
        break;
    }
  }
});

// Command handlers
async function handleAddStreamer(interaction: any, options: any) {
  const streamerName = options.get("streamer", true).value as string;
  const channelId = (options.get("channel", true).channel as TextBasedChannel)
    .id;
  const guildId = interaction.guildId!;

  const channelsData = JSON.parse(
    await fs.readFile("./channels.json", "utf-8")
  );

  let streamerFound = false;
  for (const streamer of channelsData) {
    if (streamer.channel === `#${streamerName}`) {
      streamer.Guilds.push({ guildId, channelId });
      streamerFound = true;
      break;
    }
  }

  if (!streamerFound) {
    channelsData.push({
      channel: `#${streamerName}`,
      Guilds: [{ guildId, channelId }],
    });
  }

  await fs.writeFile(
    "./channels.json",
    JSON.stringify(channelsData, null, 4),
    "utf-8"
  );

  registerCommands();
  initializeClients();

  interaction.reply({
    content: `Added ${streamerName} to the list of monitored streamers.`,
    flags: 64,
  });
}

async function handleRemoveStreamer(
  interaction: CommandInteraction<CacheType>,
  options: any
) {
  const streamerToRemove = options.get("streamer", true).value as string;
  const channel = await interaction.guild?.channels.cache.find(
    (c) => c.name === (options.get("channel", true).value as string)
  );
  const channelToRemoveId = channel?.id;

  let removed = false;

  const channelsData: streamer[] = JSON.parse(
    await fs.readFile("./channels.json", "utf-8")
  );
  for (const streamer of channelsData) {
    if (streamer.channel.toLowerCase() === streamerToRemove.toLowerCase()) {
      const originalLength = streamer.Guilds.length;
      streamer.Guilds = streamer.Guilds.filter(
        (guild) => guild.channelId !== channelToRemoveId
      );
      removed = streamer.Guilds.length < originalLength;
    }
  }

  // Remove streamers with no guilds left
  const filteredChannelsData = channelsData.filter(
    (streamer) => streamer.Guilds.length > 0
  );

  await fs.writeFile(
    "./channels.json",
    JSON.stringify(filteredChannelsData, null, 4),
    "utf-8"
  );
  registerCommands();

  initializeClients();

  const channelName = channel?.name.toString() || "Unknown Channel";
  interaction.reply({
    content: `${
      removed ? "Successfully removed" : "Failed to remove"
    } ${streamerToRemove} from logging to ${channelName}.`,
    flags: 64,
  });
}

async function handleListStreamers(interaction: CommandInteraction<CacheType>) {
  const channelsData: streamer[] = JSON.parse(
    await fs.readFile("./channels.json", "utf-8")
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

/**
 * Logs messages as specified users to specified stream channels.
 *
 * @param users - Array of user objects containing message, user, and profilePictureUrl
 * @param streamChannel - Stream channel(s) to log to
 */
async function logAsUser(
  users: user[],
  streamChannel: string[] | string
): Promise<void> {
  const channelsData = JSON.parse(
    await fs.readFile("./channels.json", "utf-8")
  ) as streamer[];

  const streamChannels = Array.isArray(streamChannel)
    ? streamChannel
    : [streamChannel];

  const messagePromises: Promise<any>[] = [];

  for (const user of users) {
    for (const channelName of streamChannels) {
      const channelDetails = channelsData.find(
        (streamer) => streamer.channel.replace("#", "") === channelName
      );

      if (!channelDetails) continue;

      // Process each guild channel only once
      const processedChannels = new Set<string>();

      for (const guildInfo of channelDetails.Guilds) {
        const channelKey = `${guildInfo.guildId}-${guildInfo.channelId}`;
        if (processedChannels.has(channelKey)) continue;
        processedChannels.add(channelKey);

        const discordGuild = client.guilds.cache.get(guildInfo.guildId);
        const channel = discordGuild?.channels.cache.get(guildInfo.channelId);

        if (!discordGuild || !(channel instanceof TextChannel)) continue;

        const formattedMessage = formatMessageWithEmojis(
          user.message,
          discordGuild
        );

        const messagePromise = (async () => {
          const webhook = await getOrCreateWebhook(
            channel,
            "Crystal Socket",
            "https://i.imgur.com/nrhRy0b.png"
          );

          if (!webhook) return;

          try {
            await sendWebhookMessage(
              webhook,
              formattedMessage,
              user.user,
              user.profilePictureUrl ?? "https://i.imgur.com/nrhRy0b.png"
            );
          } catch (error) {
            webhookCache.delete(channelKey);
          }
        })();

        messagePromises.push(messagePromise);
      }
    }
  }

  // Wait for all messages to be sent
  await Promise.all(messagePromises);
}

/**
 * Discord bot singleton class
 */
class DiscordBot {
  private static instance: DiscordBot;
  public static readonly logAsUser = logAsUser;

  private constructor() {}

  public static getInstance(): DiscordBot {
    if (!DiscordBot.instance) {
      DiscordBot.instance = new DiscordBot();
    }
    return DiscordBot.instance;
  }
}

export default DiscordBot;

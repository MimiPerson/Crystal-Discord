import {
  ActivityType,
  Channel,
  Client,
  GatewayIntentBits,
  Guild,
  GuildBasedChannel,
  Interaction,
  Message,
  Options,
  TextBasedChannel,
  TextChannel,
  Webhook,
} from "discord.js";
import config from "../config";
import { streamer, user } from "./interfaces";
import {
  formatMessageWithEmojis,
  getOrCreateWebhook,
  sendWebhookMessage,
} from "./Helpers/helpers";
import TwitchClient, { initializeClients } from "../Twitch/TwitchWebsocket";
import { get } from "http";
import { promises } from "fs";
import { channel } from "diagnostics_channel";

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
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
      guild.commands.create({
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
          },
        ],
      });
    }

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
    case "addstreamer":
      const streamerName = options.get("streamer", true).value as string;
      const channelId = (
        options.get("channel", true).channel as TextBasedChannel
      ).id;
      const guildId = interaction.guildId!;
      const channelsData = JSON.parse(
        await promises.readFile("./channels.json", "utf-8")
      );
      let streamerFound = false;
      for (const streamer of channelsData) {
        if (streamer.channel == `#${streamerName}`) {
          streamer.Guilds.push({
            guildId: guildId,
            channelId: channelId,
          });
          streamerFound = true;
          break;
        }
      }
      if (!streamerFound) {
        channelsData.push({
          channel: `#${streamerName}`,
          Guilds: [
            {
              guildId: guildId,
              channelId: channelId,
            },
          ],
        });
      }

      await promises.writeFile(
        "./channels.json",
        JSON.stringify(channelsData, null, 4),
        "utf-8"
      );
      initializeClients();

      interaction.reply({
        content: `Added ${streamerName} to the list of monitored streamers.`,
        flags: 64,
      });
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
  }
});

/**
 * Logs messages as specified users to specified stream channels.
 *
 * @param users - An array of user objects containing message, user, and profilePictureUrl.
 * @param streamChannel - A string or an array of strings representing the stream channels.
 * @returns A promise that resolves when all messages have been logged.
 *
 * The function reads channel data from a JSON file, iterates over the provided users and stream channels,
 * and sends formatted messages to the appropriate Discord channels using webhooks.
 */
async function logAsUser(
  users: user[],
  streamChannel: string[] | string
): Promise<void> {
  const channelsData = JSON.parse(
    await promises.readFile("./channels.json", "utf-8")
  ) as streamer[];

  const streamChannels = Array.isArray(streamChannel)
    ? streamChannel
    : [streamChannel];

  for (const user of users) {
    for (const channelName of streamChannels) {
      const channelDetails = channelsData.find(
        (streamer) => streamer.channel.replace("#", "") === channelName
      );

      if (!channelDetails) continue;

      for (const guildInfo of channelDetails.Guilds) {
        const discordGuild = client.guilds.cache.get(guildInfo.guildId);
        const channel = discordGuild?.channels.cache.get(guildInfo.channelId);

        if (!discordGuild || !(channel instanceof TextChannel)) continue;

        const formattedMessage = formatMessageWithEmojis(
          user.message,
          discordGuild
        );
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

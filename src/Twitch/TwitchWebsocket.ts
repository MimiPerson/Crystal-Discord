// External Dependencies
import { ApiClient, HelixUser } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import { EventSubWsListener } from "@twurple/eventsub-ws";
import { promises } from "fs";
import { ChatClient, ChatMessage } from "@twurple/chat";

import { readFile } from "fs/promises";

// Internal Dependencies
import { streamer, user } from "../DiscordBot/interfaces";
import DiscordBot from "../DiscordBot/DiscordBot";
import Helper from "./helperClass";

// ===================================
// Validate required environment variables
const validateEnv = () => {
  const required = ["clientID", "clientSecret"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Make sure you have a .env file in the root directory or environment variables set on your VPS."
    );
  }
};

validateEnv();

// Helper function to fetch channels from a JSON file
export async function getChannels(): Promise<string[]> {
  const streamers: streamer[] =
    JSON.parse(await readFile("./channels.json", "utf-8")) || [];

  return streamers.map((streamer) => streamer.channel);
}

// Configuration constants
const CONFIG = {
  clientId: process.env.clientID as string,
  clientSecret: process.env.clientSecret as string,
  userId: 106904180, // Replace with your Twitch user ID
};

setTimeout(async () => {
  const liveChannels = await Helper.getStreamersOnline();
  if (liveChannels) {
    DiscordBot.setStreamersOnline(liveChannels);
  } else {
    console.error("Failed to fetch online streamers.");
  }
}, 120000); // 2 minutes
// Service initialization
const authProvider = new RefreshingAuthProvider({
  clientId: CONFIG.clientId,
  clientSecret: CONFIG.clientSecret,
});

let chatClient: ChatClient | undefined;
let apiClient: ApiClient;
let listener: EventSubWsListener;

// Initialize Twitch clients and listeners
export async function initializeClients() {
  apiClient = new ApiClient({ authProvider });
  listener = new EventSubWsListener({ apiClient });
  listener.start();
  const liveChannels = await Helper.getStreamersOnline();

  if (liveChannels) {
    DiscordBot.setStreamersOnline(liveChannels);
  }

  // Connect to chat channels
  const channels = await getChannels();
  chatClient = undefined;
  if (channels.length === 0) return;

  chatClient = new ChatClient({
    authProvider,
    channels,
  });
  if (!chatClient) return;
  chatClient.connect();

  // Register chat event handlers
  Object.entries(Helper.eventHandlers).forEach(([event, handler]) => {
    if (event.startsWith("on") && event in chatClient!) {
      (chatClient as any)[event](handler);
    }
  });
}

// Helper function to log messages to Discord
export async function logMessage(
  channel: string,
  users: user[],
  msg?: ChatMessage
): Promise<void> {
  const formattedUsers: user[] = await Promise.all(
    users
      .filter((user): user is user => user !== null)
      .map(async (user) => ({
        user: user.user,
        message: user.message,
        profilePictureUrl:
          user.profilePictureUrl ||
          (
            await Helper.getUserData(user.user)
          ).profilePictureUrl,
      }))
  );
  await DiscordBot.logAsUser(formattedUsers, channel, msg);
}

// Helper function to log chat messages
export async function logChatMessage(
  channel: string,
  user: string,
  message: string,
  msg?: ChatMessage
): Promise<void> {
  const pfp = (await Helper.getUserData(user)).profilePictureUrl;
  const userName = msg?.userInfo.displayName || user;
  await logMessage(
    channel,
    [{ message, user: userName, profilePictureUrl: pfp }],
    msg
  );
}

// Token management and initialization
async function refreshTokens(): Promise<void> {
  try {
    const tokenData = JSON.parse(
      await promises.readFile("./tokens.json", "utf-8")
    );

    authProvider.onRefresh(async (userId: string, newTokenData: any) => {
      await promises.writeFile(
        "./tokens.json",
        JSON.stringify(newTokenData, null, 4),
        "utf-8"
      );
    });

    await authProvider.addUser(CONFIG.userId, tokenData, [
      "chat",
      "channel:read:redemptions",
      "channel:read:subscriptions",
    ]);

    await authProvider.refreshAccessTokenForUser(CONFIG.userId);
    await initializeClients();

    listener.onChannelRedemptionAdd(CONFIG.userId, (data) =>
      Helper.eventHandlers.onChannelRedemptionAdd(data)
    );

    listener.onChannelUnban(CONFIG.userId, (data) =>
      Helper.eventHandlers.onUnban(data)
    );
  } catch (error) {
    console.error("Failed to initialize auth:", error);
  }
}

// Start application
refreshTokens().catch(console.error);

/**
 * The `TwitchClient` class provides static methods and properties to interact with Twitch's API and chat functionality.
 * It acts as a utility for sending messages, managing raids, clearing chat, and accessing helper functions.
 *
 * ## Static Properties:
 * - `CONFIG`: Configuration object for the Twitch client.
 * - `getChatClient`: A function that returns the chat client instance.
 * - `getApiClient`: A function that returns the API client instance.
 * - `raidChannel`: A helper function to initiate a raid on a specified channel.
 * - `unraidChannel`: A helper function to cancel an ongoing raid.
 * - `clearChat`: A helper function to clear the chat of a specified channel.
 * - `helper`: A reference to the `Helper` utility for additional Twitch-related operations.
 *
 * ## Static Methods:
 * - `sendMessage(channel: string, userId: string, message: string): Promise<void>`:
 *   Sends a message to a specified Twitch channel as a specified user.
 *   - `channel`: The Twitch channel to send the message to.
 *   - `userId`: The user ID to send the message as.
 *   - `message`: The message to send.
 *   - Returns: A promise that resolves when the message is successfully sent.
 */
class TwitchClient {
  private static readonly apiClient = apiClient;
  private static readonly chatClient = chatClient;
  public static readonly CONFIG = CONFIG;
  public static readonly getChatClient = () => chatClient;
  public static readonly getApiClient = () => apiClient;
  public static readonly raidChannel = Helper.raidChannel;
  public static readonly unraidChannel = Helper.unraidChannel;
  public static readonly clearChat = Helper.clearChat;
  public static readonly helper = Helper;

  /**
   * Sends a message to a specified Twitch channel as a specified user.
   * @param {string} channel - The Twitch channel to send the message to.
   * @param {string} userId - The user ID to send the message as.
   * @param {string} message - The message to send.
   * @returns {Promise<void>} - A promise that resolves when the message is sent.
   */
  static async sendMessage(
    channel: string,
    userId: string,
    message: string
  ): Promise<void> {
    return this.apiClient.asUser(userId, async () => {
      await this.chatClient!.say(channel, message);
    });
  }
}

export default TwitchClient;

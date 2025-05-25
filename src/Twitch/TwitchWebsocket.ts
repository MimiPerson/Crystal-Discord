// External Dependencies
import { ApiClient } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import { EventSubWsListener } from "@twurple/eventsub-ws";
import { promises } from "fs";
import { ChatClient, ChatMessage } from "@twurple/chat";

// Internal Dependencies
import { user } from "../DiscordBot/interfaces";
import DiscordBot from "../DiscordBot/DiscordBot";
import Helper from "./helperClass";
import { MongoDB } from "../MongoDB/MongoDB";
import { Streamer } from "../MongoDB/models/streamer.model";

// ===================================
// Validate required environment variables
/**
 * Ensures that all required environment variables are set.
 * Throws an error if any are missing.
 */
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

// ===================================
// Configuration constants
const CONFIG = {
  clientId: process.env.clientID as string,
  clientSecret: process.env.clientSecret as string,
  userId: 106904180, // Replace with your Twitch user ID
};

// ===================================
// Periodic task to fetch online streamers
setTimeout(async () => {
  const liveChannels = await Helper.getStreamersOnline();
  if (liveChannels) {
    DiscordBot.setStreamersOnline(liveChannels);
  } else {
    console.error("Failed to fetch online streamers.");
  }
}, 120000); // 2 minutes

// ===================================
// Service initialization
const authProvider = new RefreshingAuthProvider({
  clientId: CONFIG.clientId,
  clientSecret: CONFIG.clientSecret,
});

let chatClient: ChatClient | undefined;
let apiClient: ApiClient;
let listener: EventSubWsListener;

// ===================================
// Initialize Twitch clients and listeners
/**
 * Initializes the Twitch API client, chat client, and event listeners.
 */
export async function initializeClients() {
  try {
    apiClient = new ApiClient({ authProvider });
    listener = new EventSubWsListener({ apiClient });
    await listener.start();
    await MongoDB.getInstance().connect();

    const liveChannels = await Helper.getStreamersOnline();
    if (liveChannels) {
      DiscordBot.setStreamersOnline(liveChannels);
    }

    // Connect to chat channels
    const channels = (await Streamer.find({}, { name: 1, _id: 0 })).map(
      (streamer) => "#" + streamer.name
    );
    if (!channels) return;

    chatClient = new ChatClient({
      authProvider,
      channels,
    });

    if (!chatClient) return;
    await chatClient.connect();

    // Register chat event handlers
    Object.entries(Helper.eventHandlers).forEach(([event, handler]) => {
      try {
        if (event.startsWith("on") && event in chatClient!) {
          (chatClient as any)[event](handler);
        }
      } catch (error) {
        console.error(`Error registering event handler for ${event}:`, error);
      }
    });
  } catch (error) {
    console.error("Failed to initialize Twitch clients:", error);
    throw error; // Re-throw to handle it in the calling function
  }
}

// const guildConfig = new Schema({
//   guildId: { type: String, required: true },
//   channelId: { type: String, required: true },
//   channelNames: {
//     live: { type: String, default: "" },
//     offline: { type: String, default: "" },
//   },
// });
// ===================================
// Helper function to log messages to Discord
/**
 * Logs a message to Discord with user details.
 * @param {string} channel - The channel to log the message to.
 * @param {user[]} users - Array of user objects.
 * @param {ChatMessage} [msg] - Optional chat message object.
 * @param {string} [event] - Optional event name.
 */
export async function logMessage(
  channel: string,
  users: user[],
  msg?: ChatMessage,
  event?: string
): Promise<void> {
  try {
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
    await DiscordBot.logAsUser(formattedUsers, channel, msg, event);
  } catch (error) {
    console.error("Error logging message to Discord:", error);
    throw error;
  }
}

// ===================================
// Helper function to log chat messages
/**
 * Logs a chat message to Discord.
 * @param {string} channel - The channel where the message was sent.
 * @param {string} user - The username of the sender.
 * @param {string} message - The message content.
 * @param {ChatMessage} [msg] - Optional chat message object.
 */
export async function logChatMessage(
  channel: string,
  user: string,
  message: string,
  msg?: ChatMessage
): Promise<void> {
  try {
    const pfp = (await Helper.getUserData(user)).profilePictureUrl;
    const userName = msg?.userInfo.displayName || user;
    await logMessage(
      channel,
      [{ message, user: userName, profilePictureUrl: pfp }],
      msg
    );
  } catch (error) {
    console.error("Error logging chat message:", error);
    throw error;
  }
}

// ===================================
// Token management and initialization
/**
 * Refreshes tokens and initializes the Twitch clients and listeners.
 */
async function refreshTokens(): Promise<void> {
  try {
    const tokenData = JSON.parse(
      await promises.readFile("./tokens.json", "utf-8")
    );

    authProvider.onRefresh(async (userId: string, newTokenData: any) => {
      try {
        await promises.writeFile(
          "./tokens.json",
          JSON.stringify(newTokenData, null, 4),
          "utf-8"
        );
      } catch (error) {
        console.error("Error saving refreshed tokens:", error);
        throw error;
      }
    });

    await authProvider.addUser(CONFIG.userId, tokenData, [
      "chat",
      "channel:read:redemptions",
      "channel:read:subscriptions",
    ]);

    await authProvider.refreshAccessTokenForUser(CONFIG.userId);
    await initializeClients();

    // Register event listeners
    listener.onChannelRedemptionAdd(CONFIG.userId, (data) => {
      try {
        Helper.eventHandlers.onChannelRedemptionAdd(data);
      } catch (error) {
        console.error("Error handling channel redemption:", error);
      }
    });

    listener.onChannelUnban(CONFIG.userId, (data) => {
      try {
        Helper.eventHandlers.onUnban(data);
      } catch (error) {
        console.error("Error handling channel unban:", error);
      }
    });
  } catch (error) {
    console.error("Failed to initialize auth:", error);
    throw error;
  }
}

// ===================================
// Start application
refreshTokens().catch(console.error);

// ===================================
// TwitchClient Class
/**
 * The `TwitchClient` class provides static methods and properties to interact with Twitch's API and chat functionality.
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
    try {
      return await this.apiClient.asUser(userId, async () => {
        await this.chatClient!.say(channel, message);
      });
    } catch (error) {
      console.error(`Error sending message to channel ${channel}:`, error);
      throw error;
    }
  }
}

export default TwitchClient;

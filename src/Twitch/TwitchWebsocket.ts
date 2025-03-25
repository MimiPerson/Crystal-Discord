import { ApiClient, HelixUser } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import { EventSubWsListener } from "@twurple/eventsub-ws";
import { promises } from "fs";
import {
  ChatAnnouncementInfo,
  ChatClient,
  ChatMessage,
  ClearChat,
  UserNotice,
} from "@twurple/chat";
import {
  EventSubChannelRedemptionAddEvent,
  EventSubChannelUnbanEvent,
} from "@twurple/eventsub-base";
import { streamer, user } from "../DiscordBot/interfaces";
import { readFile } from "fs/promises";
import { config } from "dotenv";
import { resolve } from "path";
import DiscordBot from "../DiscordBot/DiscordBot";

// Load environment variables
config({ path: resolve(__dirname, "../../.env") });

// Validate environment variables
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

async function getChannels(): Promise<string[]> {
  const streamers: streamer[] =
    JSON.parse(await readFile("./channels.json", "utf-8")) || [];

  const channels: string[] = [];
  streamers.forEach((streamer) => {
    channels.push(streamer.channel);
  });
  return channels;
}

// Configuration
const CONFIG = {
  clientId: process.env.clientID as string,
  clientSecret: process.env.clientSecret as string,
  userId: 106904180,
};

// Service initialization
const authProvider = new RefreshingAuthProvider({
  clientId: CONFIG.clientId,
  clientSecret: CONFIG.clientSecret,
});

let chatClient: ChatClient;
let apiClient: ApiClient;

export async function initializeClients() {
  apiClient = new ApiClient({ authProvider });
  const channels = await getChannels();
  if (channels.length === 0) return;
  chatClient = new ChatClient({
    authProvider,
    channels,
  });
  chatClient.connect();
  // Set up chat event listeners
  Object.entries(eventHandlers).forEach(([event, handler]) => {
    if (event.startsWith("on") && event in chatClient) {
      (chatClient as any)[event](handler);
    }
  });
}

// User data helper
async function getUserData(user: string): Promise<HelixUser> {
  const userData = await apiClient.users.getUserByName(user);
  if (!userData) throw new Error("User not found");
  return userData;
}

// Logging helpers
async function logMessage(channel: string, users: user[]): Promise<void> {
  const formattedUsers: user[] = await Promise.all(
    users
      .filter((user): user is user => user !== null)
      .map(async (user) => ({
        user: user.user,
        message: user.message,
        profilePictureUrl:
          user.profilePictureUrl ||
          (
            await getUserData(user.user)
          ).profilePictureUrl,
      }))
  );
  await DiscordBot.logAsUser(formattedUsers, channel);
}

async function logChatMessage(
  channel: string,
  user: string,
  message: string,
  msg?: ChatMessage
): Promise<void> {
  const pfp = (await getUserData(user)).profilePictureUrl;
  const userName = msg?.userInfo.displayName || user;
  await logMessage(channel, [
    { message, user: userName, profilePictureUrl: pfp },
  ]);
}

// Event handlers
const eventHandlers = {
  onMessage: async (
    channel: string,
    user: string,
    message: string,
    msg: ChatMessage
  ) => {
    await logChatMessage(channel, user, message, msg);
  },
  onAction: async (
    channel: string,
    user: string,
    message: string,
    msg: ChatMessage
  ) => {
    await logChatMessage(channel, user, `*${message}*`, msg);
  },
  onAnnouncement: async (
    channel: string,
    user: string,
    announcementInfo: ChatAnnouncementInfo,
    notice: UserNotice
  ) => {
    await logMessage(channel, [
      { message: `*${notice.text}*`, user: user, profilePictureUrl: null },
    ]);
  },
  onBan: async (channel: string, user: string) => {
    await logMessage(channel, [
      {
        message: `https://tenor.com/view/kaf-kafu-kamitsubaki-rim-rime-gif-27228643`,
        user: user,
      } as user,
    ]);
  },

  onTimeout: async (
    channel: string,
    user: string,
    duration: number,
    msg: ClearChat
  ) => {
    await logMessage(channel, [
      {
        message: `https://tenor.com/view/yae-yae-miko-yae-sakura-bonk-anime-yae-bonk-gif-26001721`,
        user: user,
      } as user,
    ]);
  },

  //TODO: Fix listeners not working
  // onChannelRedemptionAdd: async (data: EventSubChannelRedemptionAddEvent) => {
  //   const users: user[] = [
  //     {
  //       message: `Redeemed ${data.rewardTitle} for ${data.userDisplayName}`,
  //       user: "Channel Point Redeem",
  //       profilePictureUrl: "https://i.imgur.com/FJUEIhs.png",
  //     },
  //     data.input
  //       ? {
  //           message: `*${data.input}*`,
  //           user: data.userDisplayName,
  //           profilePictureUrl: null,
  //         }
  //       : null,
  //   ].filter((u): u is user => u !== null);
  //   await logMessage(users);
  // },
};

// Token management
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
  } catch (error) {
    console.error("Failed to initialize auth:", error);
  }
}

// Start application
refreshTokens().catch(console.error);

class TwitchClient {
  public static readonly chatClient = chatClient;
  public static readonly apiClient = apiClient;

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
      await this.chatClient.say(channel, message);
    });
  }
}

export default TwitchClient;

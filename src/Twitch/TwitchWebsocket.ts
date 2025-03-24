import { ApiClient, HelixUser } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import { EventSubWsListener } from "@twurple/eventsub-ws";
import { promises as fs } from "fs";
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
import { user } from "../DiscordBot/interfaces";
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
// Configuration
const CONFIG = {
  clientId: process.env.clientID as string, // Changed from env.clientId
  clientSecret: process.env.clientSecret as string, // Changed from env.clientSecret
  userId: 106904180,
  channel: "#mimi_py",
};

// Service initialization
const authProvider = new RefreshingAuthProvider({
  clientId: CONFIG.clientId, // Changed to use CONFIG
  clientSecret: CONFIG.clientSecret, // Changed to use CONFIG
});

const chatClient = new ChatClient({
  authProvider,
  channels: [CONFIG.channel],
});

const apiClient = new ApiClient({ authProvider });

// User data helper
async function getUserData(user: string): Promise<HelixUser> {
  const userData = await apiClient.users.getUserByName(user);
  if (!userData) throw new Error("User not found");
  return userData;
}

// Logging helpers
async function logMessage(users: user[]): Promise<void> {
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
  await DiscordBot.logAsUser(formattedUsers);
}

async function logChatMessage(
  user: string,
  message: string,
  msg?: ChatMessage
): Promise<void> {
  const pfp = (await getUserData(user)).profilePictureUrl;
  const userName = msg?.userInfo.displayName || user;
  await logMessage([{ message, user: userName, profilePictureUrl: pfp }]);
}

// Event handlers
/**
 * Collection of event handlers for Twitch chat events
 * @property {Function} onUnfollow - Handles unfollow events and logs them
 * @property {Function} onMessage - Handles chat messages and logs them if not redemptions
 * @property {Function} onAction - Handles chat actions (e.g. /me commands) and logs them
 * @property {Function} onAnnouncement - Handles channel announcements and logs them
 * @property {Function} onBan - Handles user ban events and logs them with a GIF
 * @property {Function} onUnban - Handles user unban events and logs them with a GIF
 * @property {Function} onTimeout - Handles user timeout events and logs them with a GIF
 * @property {Function} onChannelRedemptionAdd - Handles channel point redemptions and logs them
 */
const eventHandlers = {
  onUnfollow: async (
    followers: { user: string; userId: string; createdAt: string }[]
  ) => {
    const unfollowedUsers = followers.map(
      (follower) =>
        ({
          user: follower.user,
          message: `I have left the community 💀`,
        } as user)
    );
    await logMessage(unfollowedUsers);
  },
  onMessage: async (
    channel: string,
    user: string,
    message: string,
    msg: ChatMessage
  ) => {
    if (!msg.isRedemption) {
      await logChatMessage(user, message, msg);
    }
  },
  onAction: async (
    channel: string,
    user: string,
    message: string,
    msg: ChatMessage
  ) => {
    await logChatMessage(user, `*${message}*`, msg);
  },
  onAnnouncement: async (
    channel: string,
    user: string,
    announcementInfo: ChatAnnouncementInfo,
    notice: UserNotice
  ) => {
    await logMessage([
      { message: `*${notice.text}*`, user: user, profilePictureUrl: null },
    ]);
  },
  onBan: async (channel: string, user: string) => {
    await logMessage([
      {
        message: `https://tenor.com/view/kaf-kafu-kamitsubaki-rim-rime-gif-27228643`,
        user: user,
      } as user,
    ]);
  },
  onUnban: async (data: EventSubChannelUnbanEvent) => {
    await logMessage([
      {
        message: `https://tenor.com/view/im-back-killua-killua-zoldyck-anime-discord-gif-21123576`,
        user: data.userDisplayName,
      } as user,
    ]);
  },
  onTimeout: async (
    channel: string,
    user: string,
    duration: number,
    msg: ClearChat
  ) => {
    await logMessage([
      {
        message: `https://tenor.com/view/yae-yae-miko-yae-sakura-bonk-anime-yae-bonk-gif-26001721`,
        user: user,
      } as user,
    ]);
  },
  onChannelRedemptionAdd: async (data: EventSubChannelRedemptionAddEvent) => {
    const users: user[] = [
      {
        message: `Redeemed ${data.rewardTitle} for ${data.userDisplayName}`,
        user: "Channel Point Redeem",
        profilePictureUrl: "https://i.imgur.com/FJUEIhs.png",
      },
      data.input
        ? {
            message: `*${data.input}*`,
            user: data.userDisplayName,
            profilePictureUrl: null,
          }
        : null,
    ].filter((u): u is user => u !== null);
    await logMessage(users);
  },
};

/**
 * Fetches the list of followers for a specified user and updates the local followers.json file.
 * It also identifies users who have unfollowed since the last update and triggers an event for unfollowed users.
 *
 * @async
 * @function getFollowers
 * @returns {Promise<void>} A promise that resolves when the followers have been fetched and the file has been updated.
 * @throws Will log an error message if the fetching or file operations fail.
 */
/**
 * Retrieves and processes Twitch channel followers, comparing them with previously stored followers
 * to detect unfollows and updates the local followers.json file.
 *
 * The function performs the following operations:
 * 1. Fetches all current followers from Twitch API using pagination
 * 2. Reads the existing followers from followers.json
 * 3. Compares current followers with stored followers to detect unfollows
 * 4. Triggers onUnfollow event handler for unfollowed users
 * 5. Updates followers.json with new data
 *
 * @throws {Error} When there's an issue accessing Twitch API or file operations fail
 *
 *
 * @async
 * @returns {Promise<void>}
 */
async function getFollowers() {
  try {
    const ctx = await apiClient.asUser(CONFIG.userId, async (ctx) => ctx);
    let cursor = "";

    interface Follower {
      user: string;
      userId: string;
      createdAt: Date;
    }

    let allFollowers: Follower[] = [];
    console.log("Fetching followers...");

    const [currentFollowersFile, firstBatch] = await Promise.all([
      readFile("./followers.json", "utf-8")
        .then((data) => JSON.parse(data))
        .catch(() => ({ followers: [], unfollowedUsers: [] })),
      ctx.channels.getChannelFollowers(CONFIG.userId, undefined, {
        after: cursor,
        limit: 100,
      }),
    ]);

    const oldFollowers: Follower[] = (currentFollowersFile.followers || []).map(
      (f: any) => ({
        user: f.user,
        userId: f.userId,
        createdAt: new Date(f.createdAt),
      })
    );

    allFollowers = firstBatch.data.map((f) => ({
      user: f.userDisplayName,
      userId: f.userId,
      createdAt: f.followDate,
    }));
    cursor = firstBatch.cursor || "";
    let i = 0;

    while (cursor) {
      i++;
      const page = await ctx.channels.getChannelFollowers(
        CONFIG.userId,
        undefined,
        { after: cursor, limit: 100 }
      );
      allFollowers.push(
        ...page.data.map((f) => ({
          user: f.userDisplayName,
          userId: f.userId,
          createdAt: f.followDate,
        }))
      );
      cursor = page.cursor || "";
    }

    const newIds = new Set(allFollowers.map((f) => f.userId));
    const unfollowed = oldFollowers.filter((f) => !newIds.has(f.userId));

    if (unfollowed.length) {
      eventHandlers.onUnfollow(
        unfollowed.map((u) => ({
          user: u.user,
          userId: u.userId,
          createdAt: u.createdAt.toISOString(),
        }))
      );
    }

    const followers = {
      listUpdated: Date.now(),
      totalFollowers: allFollowers.length,
      totalUnfollowed: unfollowed.length,
      unfollowedUsers: unfollowed.map((u) => ({
        user: u.user,
        userId: u.userId,
        createdAt: u.createdAt,
      })),
      followers: allFollowers,
    };
    console.log("Followers fetched successfully!");
    await fs.writeFile(
      "./followers.json",
      JSON.stringify(followers, null, 4),
      "utf-8"
    );
  } catch (error) {
    console.error("Failed to get followers:", error);
  }
}
async function raidChannel(channel: string): Promise<boolean | string> {
  try {
    const raidChannel = await apiClient.users.getUserByName(channel);
    if (!raidChannel) return "Raid channel not found";

    await apiClient.raids.startRaid(CONFIG.userId, raidChannel.id);
    return true; // Raid started successfully
  } catch (error) {
    return false;
  }
}
async function unraidChannel(): Promise<boolean> {
  try {
    await apiClient.raids.cancelRaid(CONFIG.userId);
    return true; // Unraid started successfully
  } catch (error) {
    return false;
  }
}
async function clearChat(): Promise<boolean> {
  try {
    await apiClient.moderation.deleteChatMessages(CONFIG.userId);
    return true; // Chat cleared successfully
  } catch (error) {
    return false;
  }
}
// Initialize services
async function initializeServices(): Promise<void> {
  const listener = new EventSubWsListener({ apiClient });
  await listener.start();

  chatClient.connect();

  // Set up EventSub listeners
  listener.onChannelRedemptionAdd(CONFIG.userId, (data) =>
    eventHandlers.onChannelRedemptionAdd(data)
  );
  listener.onChannelUnban(CONFIG.userId, (data) => eventHandlers.onUnban(data));

  listener.onStreamOnline(CONFIG.userId, async (data) =>
    DiscordBot.setStreamActive(true)
  );

  listener.onStreamOffline(CONFIG.userId, async (data) =>
    DiscordBot.setStreamActive(false)
  );

  // Set up chat event listeners
  Object.entries(eventHandlers).forEach(([event, handler]) => {
    if (event.startsWith("on") && event in chatClient) {
      (chatClient as any)[event](handler);
    }
  });

  // Get followers after authentication is complete
  setInterval(getFollowers, 3600000); // Run every hour
  getFollowers(); // Run immediately on startup
}

// Token management
async function refreshTokens(): Promise<void> {
  try {
    const tokenData = JSON.parse(await fs.readFile("./tokens.json", "utf-8"));

    authProvider.onRefresh(async (userId: string, newTokenData: any) => {
      await fs.writeFile(
        "./tokens.json",
        JSON.stringify(newTokenData, null, 4),
        "utf-8"
      );
    });

    await authProvider.addUser(CONFIG.userId, tokenData, [
      "chat",
      "channel:read:redemptions",
      "channel:manage:redemptions",
      "channel:read:subscriptions",
    ]);

    await authProvider.refreshAccessTokenForUser(CONFIG.userId);
    await initializeServices();
  } catch (error) {
    console.error("Failed to initialize auth:", error);
  }
}

// Start application
refreshTokens().catch(console.error);

class TwitchClient {
  public static readonly chatClient = chatClient;
  public static readonly apiClient = apiClient;
  public static readonly raidChannel = raidChannel;
  public static readonly unraidChannel = unraidChannel;
  public static readonly clearChat = clearChat;

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

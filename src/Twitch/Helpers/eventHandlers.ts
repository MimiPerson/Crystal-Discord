import {
  ChatAnnouncementInfo,
  ChatMessage,
  ClearChat,
  UserNotice,
} from "@twurple/chat";
import Helper from "../helperClass";
import {
  EventSubChannelRedemptionAddEvent,
  EventSubChannelUnbanEvent,
} from "@twurple/eventsub-base";
import { user } from "../../DiscordBot/interfaces";

// Event handlers for Twitch events
let messageTimeout = ""; // Used to prevent duplicate handling of the same event

const eventHandlers = {
  /**
   * Handles unfollow events.
   */
  onUnfollow: async (
    followers: { user: string; userId: string; createdAt: string }[]
  ) => {
    try {
      const userId = followers[0]?.userId;
      if (messageTimeout === userId) return; // Prevent duplicate handling

      messageTimeout = userId;

      const unfollowedUsers = followers.map((follower) => ({
        user: follower.user,
        message: `I have left the community 💀`,
      }));

      await Helper.logMessage("mimi_py", unfollowedUsers);
    } catch (error) {
      console.error("Error handling unfollow event:", error);
    }
  },

  /**
   * Handles chat messages.

   */
  onMessage: async (
    channel: string,
    user: string,
    message: string,
    msg: ChatMessage
  ) => {
    try {
      if (messageTimeout === msg.id) return; // Prevent duplicate handling

      messageTimeout = msg.id;

      await Helper.logChatMessage(channel, user, message, msg);
    } catch (error) {
      console.error(`Error handling message in channel ${channel}:`, error);
    }
  },

  /**
   * Handles action messages (e.g., /me messages).
 
   */
  onAction: async (
    channel: string,
    user: string,
    message: string,
    msg: ChatMessage
  ) => {
    try {
      if (messageTimeout === msg.id) return; // Prevent duplicate handling

      messageTimeout = msg.id;

      await Helper.logChatMessage(channel, user, message, msg);
    } catch (error) {
      console.error(`Error handling action in channel ${channel}:`, error);
    }
  },

  /**
   * Handles announcements in chat.

   */
  onAnnouncement: async (
    channel: string,
    user: string,
    announcementInfo: ChatAnnouncementInfo,
    notice: UserNotice
  ) => {
    try {
      if (messageTimeout === notice.id) return; // Prevent duplicate handling

      messageTimeout = notice.id;

      await Helper.logMessage(channel, [{ message: `*${notice.text}*`, user }]);
    } catch (error) {
      console.error(`Error handling announcement in channel ${channel}:`, error);
    }
  },

  /**
   * Handles user ban events.

   */
  onBan: async (channel: string, user: string) => {
    try {
      if (messageTimeout === channel) return; // Prevent duplicate handling

      messageTimeout = channel;

      await Helper.logMessage(
        channel,
        [
          {
            message: `https://tenor.com/view/kaf-kafu-kamitsubaki-rim-rime-gif-27228643`,
            user,
          },
        ],
        undefined,
        "onBan"
      );
    } catch (error) {
      console.error(`Error handling ban in channel ${channel}:`, error);
    }
  },

  /**
   * Handles user unban events.
   */
  onUnban: async (data: EventSubChannelUnbanEvent) => {
    try {
      if (messageTimeout === data.userId) return; // Prevent duplicate handling

      messageTimeout = data.userId;

      await Helper.logMessage(
        data.broadcasterName,
        [
          {
            message: `https://tenor.com/view/im-back-killua-killua-zoldyck-anime-discord-gif-21123576`,
            user: data.userDisplayName,
          },
        ],
        undefined,
        "onUnban"
      );
    } catch (error) {
      console.error(`Error handling unban for user ${data.userDisplayName}:`, error);
    }
  },

  /**
   * Handles channel point redemption events.
   */
  onChannelRedemptionAdd: async (data: EventSubChannelRedemptionAddEvent) => {
    try {
      const redemptionDate = data.redemptionDate.toDateString();
      if (messageTimeout === redemptionDate) return; // Prevent duplicate handling

      messageTimeout = redemptionDate;

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
            }
          : null,
      ].filter((u): u is user => u !== null); // Filter out null values

      await Helper.logMessage(data.broadcasterName, users);
    } catch (error) {
      console.error(`Error handling channel point redemption for ${data.userDisplayName}:`, error);
    }
  },

  /**
   * Handles user timeout events.
 
   */
  onTimeout: async (
    channel: string,
    user: string,
    duration: number,
    msg: ClearChat
  ) => {
    try {
      if (messageTimeout === user) return; // Prevent duplicate handling

      messageTimeout = user;

      await Helper.logMessage(channel, [
        {
          message: `https://tenor.com/view/yae-yae-miko-yae-sakura-bonk-anime-yae-bonk-gif-26001721`,
          user,
        },
      ]);
    } catch (error) {
      console.error(`Error handling timeout in channel ${channel}:`, error);
    }
  },
};

export default eventHandlers;

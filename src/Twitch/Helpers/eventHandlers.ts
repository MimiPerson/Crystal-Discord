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
let messageTimeout = "";

const eventHandlers = {
  onUnfollow: async (
    followers: { user: string; userId: string; createdAt: string }[]
  ) => {
    const userId = followers[0]?.userId;
    if (messageTimeout === userId) return;

    messageTimeout = userId;
    const unfollowedUsers = followers.map((follower) => ({
      user: follower.user,
      message: `I have left the community 💀`,
    }));

    await Helper.logMessage("mimi_py", unfollowedUsers);
  },

  onMessage: async (
    channel: string,
    user: string,
    message: string,
    msg: ChatMessage
  ) => {
    if (messageTimeout === msg.id) return;

    messageTimeout = msg.id;
    await Helper.logChatMessage(channel, user, message, msg);
  },

  onAction: async (
    channel: string,
    user: string,
    message: string,
    msg: ChatMessage
  ) => {
    if (messageTimeout === msg.id) return;

    messageTimeout = msg.id;
    await Helper.logChatMessage(channel, user, `*${message}*`, msg);
  },

  onAnnouncement: async (
    channel: string,
    user: string,
    announcementInfo: ChatAnnouncementInfo,
    notice: UserNotice
  ) => {
    if (messageTimeout === notice.id) return;

    messageTimeout = notice.id;
    await Helper.logMessage(channel, [{ message: `*${notice.text}*`, user }]);
  },

  onBan: async (channel: string, user: string) => {
    if (messageTimeout === channel) return;

    messageTimeout = channel;
    await Helper.logMessage(channel, [
      {
        message: `https://tenor.com/view/kaf-kafu-kamitsubaki-rim-rime-gif-27228643`,
        user,
      },
    ]);
  },

  onUnban: async (data: EventSubChannelUnbanEvent) => {
    if (messageTimeout === data.userId) return;

    messageTimeout = data.userId;
    await Helper.logMessage(data.broadcasterName, [
      {
        message: `https://tenor.com/view/im-back-killua-killua-zoldyck-anime-discord-gif-21123576`,
        user: data.userDisplayName,
      },
    ]);
  },

  onChannelRedemptionAdd: async (data: EventSubChannelRedemptionAddEvent) => {
    if (messageTimeout === data.redemptionDate.toDateString()) return;

    messageTimeout = data.redemptionDate.toDateString();
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
    ].filter((u): u is user => u !== null);

    await Helper.logMessage(data.broadcasterName, users);
  },

  onTimeout: async (
    channel: string,
    user: string,
    duration: number,
    msg: ClearChat
  ) => {
    if (messageTimeout === user) return;

    messageTimeout = user;
    await Helper.logMessage(channel, [
      {
        message: `https://tenor.com/view/yae-yae-miko-yae-sakura-bonk-anime-yae-bonk-gif-26001721`,
        user,
      },
    ]);
  },
};

export default eventHandlers;

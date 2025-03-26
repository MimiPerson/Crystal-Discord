import { getUserData } from "./Helpers/basicHelpers";
import { clearChat, raidChannel, unraidChannel } from "./Helpers/commands";
import eventHandlers from "./Helpers/eventHandlers";

import getStreamersOnline from "./Helpers/getStreamersOnline";
import { getChannels, logChatMessage, logMessage } from "./TwitchWebsocket";

/**
 * Helper class providing utility methods for Twitch stream management and interactions.
 *
 * This class serves as a facade for various Twitch-related operations, organized by
 * functionality including stream information retrieval, channel management actions,
 * user data access, logging capabilities, and event handling.
 *
 * All methods are provided as static members for easy access without instantiation.
 *
 * @class
 * @example
 * // Get list of online streamers
 * const onlineStreamers = Helper.getStreamersOnline();
 *
 * // Log a chat message
 * Helper.logChatMessage(message);
 */
class Helper {
  // Stream information
  public static getStreamersOnline = getStreamersOnline;
  public static getChannels = getChannels;

  // Channel actions
  public static raidChannel = raidChannel;
  public static unraidChannel = unraidChannel;
  public static clearChat = clearChat;

  // User and logging functions
  public static getUserData = getUserData;
  public static logMessage = logMessage;
  public static logChatMessage = logChatMessage;

  // Event handling
  public static eventHandlers = eventHandlers;
}

export default Helper;

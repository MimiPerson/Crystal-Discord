import { initializeClients } from "../Twitch/TwitchWebsocket";
import { handleAddStreamer } from "./Helpers/handleAddStreamer";

import handleRemoveStreamer from "./Helpers/handleRemoveStreamer";
import { handleTwitchCommands } from "./Helpers/handleTwitchCommands";
import handleTwitchEvents from "./Helpers/handleTwitchEvents";
import { handleListStreamers, setActivity } from "./Helpers/helpers";
import { logAsUser } from "./Helpers/logAsUser";
import {
  getStreamerChoices,
  registerCommands,
} from "./Helpers/registerCommands";
import { setStreamersOnline } from "./Helpers/setStreamerOnline";
import {
  handleClearChat,
  handleRaid,
  handleUnraid,
} from "./Helpers/twitchCommands";

/**
 * A utility class that provides static methods for managing streamers,
 * handling Discord bot commands, and performing various bot-related actions.
 */
class Helper {
  /**
   * Handles the addition of a new streamer.
   */
  public static handleAddStreamer = handleAddStreamer;

  /**
   * Handles the removal of an existing streamer.
   */
  public static handleRemoveStreamer = handleRemoveStreamer;

  /**
   * Retrieves and handles the list of all streamers.
   */
  public static handleListStreamers = handleListStreamers;

  /**
   * Initiates a raid action.
   */
  public static handleRaid = handleRaid;

  /**
   * Cancels an ongoing raid.
   */
  public static handleUnraid = handleUnraid;

  /**
   * Clears the chat in a Discord channel.
   */
  public static handleClearChat = handleClearChat;

  /**
   * Registers bot commands with Discord.
   */
  public static registerCommands = registerCommands;

  /**
   * Retrieves a list of streamer choices for commands or actions.
   */
  public static getStreamerChoices = getStreamerChoices;

  /**
   * Logs actions or messages as a specific user.
   */
  public static logAsUser = logAsUser;

  /**
   * Updates the status of streamers to online.
   */
  public static setStreamersOnline = setStreamersOnline;

  /**
   * Sets the bot's activity status in Discord.
   */
  public static setActivity = setActivity;

  /**
   * Handles Twitch-specific events.
   */
  public static handleTwitchEvents = handleTwitchEvents;

  /**
   * Handles Twitch-specific commands.
   */
  public static handleTwitchCommands = handleTwitchCommands;
}

interface Metrics {
  commandsExecuted: number;
  webhookCalls: number;
  errors: Record<string, number>;
  responseTime: number[];
}

class MetricsCollector {
  private static metrics: Metrics = {
    commandsExecuted: 0,
    webhookCalls: 0,
    errors: {},
    responseTime: []
  };

  static trackCommand(command: string, duration: number) {
    this.metrics.commandsExecuted++;
    this.metrics.responseTime.push(duration);
  }

  static getMetrics(): Metrics {
    return this.metrics;
  }
}

export default Helper;

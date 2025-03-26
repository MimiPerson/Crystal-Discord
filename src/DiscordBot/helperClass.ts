import { initializeClients } from "../Twitch/TwitchWebsocket";
import handleAddStreamer from "./Helpers/handleAddStreamer";
import handleRemoveStreamer from "./Helpers/handleRemoveStreamer";
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
 *
 * Static Methods:
 * - `handleAddStreamer`: Handles the addition of a new streamer.
 * - `handleRemoveStreamer`: Handles the removal of an existing streamer.
 * - `handleListStreamers`: Retrieves and handles the list of all streamers.
 * - `handleRaid`: Initiates a raid action.
 * - `handleUnraid`: Cancels an ongoing raid.
 * - `handleClearChat`: Clears the chat in a Discord channel.
 * - `registerCommands`: Registers bot commands with Discord.
 * - `getStreamerChoices`: Retrieves a list of streamer choices for commands or actions.
 * - `logAsUser`: Logs actions or messages as a specific user.
 * - `setStreamersOnline`: Updates the status of streamers to online.
 * - `setActivity`: Sets the bot's activity status in Discord.
 */
class Helper {
  public static handleAddStreamer = handleAddStreamer;
  public static handleRemoveStreamer = handleRemoveStreamer;
  public static handleListStreamers = handleListStreamers;
  public static handleRaid = handleRaid;
  public static handleUnraid = handleUnraid;
  public static handleClearChat = handleClearChat;
  public static registerCommands = registerCommands;
  public static getStreamerChoices = getStreamerChoices;
  public static logAsUser = logAsUser;
  public static setStreamersOnline = setStreamersOnline;
  public static setActivity = setActivity;
}
export default Helper;

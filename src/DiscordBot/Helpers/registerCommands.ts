import { promises } from "fs";
import DiscordBot from "../DiscordBot";
import { streamer } from "../interfaces";
import {
  ApplicationCommandDataResolvable,
  SlashCommandBuilder,
} from "discord.js";

/**
 * Registers slash commands for the Discord bot.
 * This function dynamically updates commands based on the guild and its specific requirements.
 */
async function registerCommands(): Promise<void> {
  const client = DiscordBot.getClient();

  // Iterate through all guilds the bot is a part of
  const updatePromises = Array.from(client.guilds.cache.values()).map(
    async (guild) => {
      if (!guild) return;

      try {
        // Fetch streamer choices for the current guild
        const streamerNames = await getStreamerChoices(guild.id);

        // Define the base set of commands
        const commands: ApplicationCommandDataResolvable[] = [
          {
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
                channel_types: [0], // Text channels only
              },
              {
                name: "updatechannel",
                description: "Update channel name when live",
                type: 5, // Boolean type
                required: false,
              },
              {
                name: "livename",
                description: "Channel name to use when live",
                type: 3, // String type
                required: false,
              },
              {
                name: "offlinename",
                description: "Channel name to use when offline",
                type: 3, // String type
                required: false,
              },
            ],
          },
          {
            name: "streamers",
            description: "List all monitored streamers",
            defaultMemberPermissions: "Administrator",
          },
        ];

        // Add the "removestreamer" command if there are any streamers
        if (streamerNames.length > 0) {
          commands.push({
            name: "removestreamer",
            description: "Stop monitoring target stream in channel",
            defaultMemberPermissions: "Administrator",
            options: [
              {
                name: "streamer",
                description: "Streamer to stop monitoring",
                type: 3, // String type
                required: true,
                autocomplete: true,
              },
              {
                name: "channel",
                description: "Channel to stop logging to",
                type: 3, // String type
                required: true,
                autocomplete: true,
              },
            ],
          });
        }

        // Add additional commands for the home guild
        if (guild.id === "1173586671451770880") {
          commands.push(
            {
              name: "raid",
              description: "Raid the channel",
              defaultMemberPermissions: "Administrator",
              type: 1, // Slash command
              options: [
                {
                  name: "channel",
                  description: "Channel to raid",
                  type: 3, // String type
                  required: true,
                },
              ],
            },
            {
              name: "unraid",
              description: "Stop the raid",
              defaultMemberPermissions: "Administrator",
              type: 1, // Slash command
            },
            {
              name: "clearchat",
              description: "Clear the chat",
              defaultMemberPermissions: "Administrator",
              type: 1, // Slash command
              options: [
                {
                  name: "cleartwitch",
                  description: "Clear Twitch",
                  type: 3, // String type
                  required: true,
                  choices: [
                    { name: "Yes", value: "y" },
                    { name: "No", value: "n" },
                  ],
                },
              ],
            }
          );
        }

        // Update the guild's commands in one API call
        await guild.commands.set(commands);
      } catch (error) {
        console.error("Failed to register commands:", error);
      }
    }
  );

  // Wait for all command updates to complete
  await Promise.all(updatePromises);
}

/**
 * Fetches a list of streamer choices for a specific guild.
 * @param guildId - The ID of the guild to fetch streamer choices for.
 * @returns An array of streamer choices formatted for Discord commands.
 */
async function getStreamerChoices(guildId: string) {
  // Read and parse the channels data from the JSON file
  const channelsData: streamer[] = JSON.parse(
    await promises.readFile("./channels.json", "utf-8")
  );

  // Filter streamers associated with the given guild ID
  const streamerList = channelsData
    .filter((streamer) =>
      streamer.Guilds.some((guild) => guild.guildId === guildId)
    )
    .map((streamer) => streamer.channel);

  // Map the streamer list to Discord command choices
  const choices = streamerList.map((streamer) => ({
    name: streamer.replace("#", ""), // Remove "#" from streamer names
    value: streamer,
  }));

  return choices;
}

export { registerCommands, getStreamerChoices };

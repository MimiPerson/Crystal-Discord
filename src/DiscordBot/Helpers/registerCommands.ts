import { promises } from "fs";
import DiscordBot from "../DiscordBot";
import { streamer } from "../interfaces";
import {
  ApplicationCommandDataResolvable,
  SlashCommandBuilder,
} from "discord.js";
import { Streamer } from "../../MongoDB/models/streamer.model";
import { ClipConfig } from "../../MongoDB/models/clips.model";

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
        const clipConfig = await ClipConfig.find({ guildId: guild.id });
        const clipRoles: any = () => { return Array.from(new Set(clipConfig.map(clipRole => clipRole.roles).flat())) };
        const clipStreamers: any = () => { return Array.from(new Set(clipConfig.map(clipRole => clipRole.streamerName))) };
        const clipChannels: any = () => { return Array.from(new Set(clipConfig.map(clipRole => clipRole.channelId))) };
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
          {
            name: "removeclips",
            description: "Remove clips from the channel",
            defaultMemberPermissions: "Administrator",
            options: [
              {
                name: "streamer",
                description: "Streamer to remove clips from",
                type: 3, // String type
                required: true,
                choices: clipStreamers().map((streamer: string) => {
                  return {
                    name: streamer,
                    value: streamer,
                  }
                }),
              },
              {
                name: "channel",
                description: "Channel to remove clips from",
                type: 3, // String type
                required: true,

                choices: clipChannels().map((channel: string) => ({
                  name: guild?.channels.cache.get(channel)?.name || "",
                  value: guild?.channels.cache.get(channel)?.id || "",
                })),


              },
              {
                name: "roles",
                description: "Remove clips for these roles",
                type: 3, // string type
                required: true,
                choices: clipRoles().map((role: string) => {
                  return {
                    name: role,
                    value: role,
                  }
                })

              }
            ],
          },
          {
            name: "saveclips",
            description: "Save clips from the channel",
            defaultMemberPermissions: "Administrator",
            options: [
              {
                name: "streamer",
                description: "Streamer to save clips from",
                type: 3, // String type
                required: true,
              },
              {
                name: "channel",
                description: "Channel to save clips from",
                type: 7, // Channel type
                required: true,
              },
              {
                name: "roles",
                description: "save clips for these roles",
                type: 3, // string type
                required: true,
                choices: [
                  {
                    name: "moderator",
                    value: "moderator",
                  },
                  {
                    name: "broadcaster",
                    value: "broadcaster",
                  },
                  {
                    name: "bot",
                    value: "bot",
                  },
                  {
                    name: "all",
                    value: "all",
                  }
                ]

              }
            ],
          }
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
              name: "testactivity",
              description: "Test activity",
              defaultMemberPermissions: "Administrator",
              type: 1, // Slash command
              options: [{
                name: "user",
                description: "User to test activity",
                type: 6, // User type
                required: true,
              }]
            },
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
  const channelsData = await Streamer.find({
    guilds: { $elemMatch: { guildId } },
  });

  // Map the streamer list to Discord command choices
  const choices = channelsData.map((streamer) => ({
    name: streamer.name, // Remove "#" from streamer names
    value: streamer.name,
  }));

  return choices;
}

export { registerCommands, getStreamerChoices };

import { promises } from "fs";
import DiscordBot from "../DiscordBot";
import { streamer } from "../interfaces";
import { ApplicationCommandDataResolvable } from "discord.js";

// Register slash commands
async function registerCommands(): Promise<void> {
  const client = DiscordBot.getClient();
  const updatePromises = Array.from(client.guilds.cache.values()).map(
    async (guild) => {
      if (!guild) return;
      try {
        const streamerNames = await getStreamerChoices(guild.id);
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
                type: 3,
                required: false,
              },
              {
                name: "offlinename",
                description: "Channel name to use when offline",
                type: 3,
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
        // Add remove streamer command if there are any streamers
        if (streamerNames.length > 0) {
          commands.push({
            name: "removestreamer",
            description: "Stop monitoring target stream in channel",
            defaultMemberPermissions: "Administrator",

            options: [
              {
                name: "streamer",
                description: "Streamer to stop monitoring",
                type: 3,
                required: true,
                autocomplete: true,
              },
              {
                name: "channel",
                description: "Channel to stop logging to",
                type: 3,
                required: true,
                autocomplete: true,
              },
            ],
          });
        }

        //if home guild
        if (guild.id === "1173586671451770880") {
          commands.push(
            // raid command
            {
              name: "raid",
              description: "Raid the channel",
              defaultMemberPermissions: "Administrator",
              type: 1, // Slash command

              options: [
                {
                  name: "channel",
                  description: "Channel to raid",
                  type: 3, // String
                  required: true,
                },
              ],
            },
            // unraid command
            {
              name: "unraid",
              description: "Stop the raid",
              defaultMemberPermissions: "Administrator",
              type: 1, // Slash command
            },
            // clearchat command
            {
              name: "clearchat",
              description: "Clear the chat",
              defaultMemberPermissions: "Administrator",
              type: 1, // Slash command

              options: [
                {
                  name: "cleartwitch",
                  description: "Clear Twitch",
                  type: 3,
                  required: true,
                  choices: [
                    {
                      name: "Yes",
                      value: "y",
                    },
                    {
                      name: "No",
                      value: "n",
                    },
                  ],
                },
              ],
            }
          );
        }

        // Use set method to handle command updates in one API call

        await guild.commands.set(commands);
      } catch (error) {
        console.log("Failed to register commands:", error);
      }
    }
  );

  // Wait for all command updates to complete
  await Promise.all(updatePromises);
  return;
}

async function getStreamerChoices(guildId: string) {
  const channelsData: streamer[] = JSON.parse(
    await promises.readFile("./channels.json", "utf-8")
  );

  const streamerList = channelsData
    .filter((streamer) =>
      streamer.Guilds.some((guild) => guild.guildId === guildId)
    )
    .map((streamer) => streamer.channel);
  const choices = await streamerList.map((streamer) => ({
    name: streamer.replace("#", ""),
    value: streamer,
  }));
  return choices;
}

export { registerCommands, getStreamerChoices };

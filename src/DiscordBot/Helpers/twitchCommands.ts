import { Interaction, TextChannel } from "discord.js";
import TwitchClient from "../../Twitch/TwitchWebsocket";
import DiscordBot from "../DiscordBot";

async function handleRaid(interaction: Interaction, options: any) {
  const client = DiscordBot.getClient();
  if (!interaction.isCommand() || !client) return;

  await TwitchClient.raidChannel(options.data[0].value as string).then(
    async (response) => {
      if (typeof response === "string") {
        return await interaction.reply({
          content: response,
          flags: 64,
        });
      }
      if (response) {
        return interaction.reply({
          content: `Raid started on ${options.data[0].value}`,
          flags: 64,
        });
      }
      return await interaction.reply({
        content: `Raid failed on ${options.data[0].value}`,
        flags: 64,
      });
    }
  );
}
async function handleUnraid(interaction: Interaction) {
  const client = DiscordBot.getClient();
  if (!interaction.isCommand() || !client) return;

  await TwitchClient.unraidChannel().then(async (response) => {
    if (response) {
      return interaction.reply({
        content: `Raid has been stopped`,
        flags: 64,
      });
    }
    return await interaction.reply({
      content: `failed to stop raid`,
      flags: 64,
    });
  });
}
async function handleClearChat(interaction: Interaction, options: any) {
  const client = DiscordBot.getClient();
  if (!interaction.isCommand() || !client) return;

  const guild = await client.guilds.fetch("1173586671451770880");
  const channel = (await guild.channels.fetch(
    "1352682099085414470"
  )) as TextChannel;

  channel.bulkDelete(25, true).catch((err) => {
    interaction.reply({
      content: `Failed to delete discord messages`,
      flags: 64,
    });
  });
  const wipeTwitchChat = (options.data[0].value as string) === "y";
  if (wipeTwitchChat) {
    await TwitchClient.clearChat().catch((err) => {
      interaction.reply({
        content: `Failed to delete twitch messages`,
        flags: 64,
      });
    });
  }
  await interaction.reply({
    content: `Chat has been cleared`,
    flags: 64,
  });
}

export { handleRaid, handleClearChat, handleUnraid };

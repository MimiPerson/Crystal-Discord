import { CacheType, CommandInteraction, TextChannel } from "discord.js";
import { ClipConfig } from "../../MongoDB/models/clips.model";



export async function handleSaveClips(interaction: CommandInteraction<CacheType>, options: any) {
    const guildId = interaction.guildId;
    const channel = options.get("channel", true).channel as TextChannel;
    const roles = options.get("roles", true).value as string;
    const streamerName = options.get("streamer", true).value as string;


    try {
        const clipConfig = await ClipConfig.findOne({ guildId: guildId, channelId: channel.id, streamerName: streamerName }) || new ClipConfig({ guildId: guildId, channelId: channel.id, streamerName: streamerName });
        clipConfig.streamerName = streamerName;
        clipConfig.roles.push(roles);
        await clipConfig.save();

        interaction.reply({
            content: `Clips will be saved for the following roles: ${clipConfig.roles.join(", ")}`,
            flags: 64,
        });
    } catch (error) {
        console.error(error);
    }

}
export async function handleRemoveClips(interaction: CommandInteraction<CacheType>, options: any) {
    const guildId = interaction.guildId;
    const channelInput = options.get("channel", true).value as string;
    const channel = interaction.guild?.channels.cache.get(channelInput) as TextChannel;
    const roles = options.get("roles", true).value as string;
    const streamerName = options.get("streamer", true).value as string;

    try {
        const clipConfig = await ClipConfig.findOne({ guildId: guildId, channelId: channel?.id, streamerName: streamerName });

        if (!clipConfig) {
            return interaction.reply({
                content: `No clip configuration found for this streamer`,
                flags: 64,
            });
        }

        clipConfig.roles = clipConfig.roles.filter((role) => role !== roles);
        if (clipConfig.roles.length === 0) {
            await clipConfig.deleteOne();
            return interaction.reply({
                content: `Clips will no longer be saved for this streamer`,
                flags: 64,
            });
        }
        await clipConfig.save();
        return interaction.reply({
            content: `Clips will no longer be saved for the following roles: ${clipConfig.roles.join(", ")}`,
            flags: 64,
        });
    } catch (error) {
        console.error(error);
    }
}
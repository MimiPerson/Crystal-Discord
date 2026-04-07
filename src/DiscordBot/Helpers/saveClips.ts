import { ChatMessage } from "@twurple/chat";
import DiscordBot from "../DiscordBot";
import { getDiscordChannel, sendMessageViaWebhook } from "./logAsUser";




export async function saveClips(clipUrl: string, streamerConfig: any, msg: ChatMessage) {

    console.log(streamerConfig);
    try {

        const userType = Array.from(msg.userInfo.badges.keys()).includes("bot-badge") ? "bot" : msg.userInfo.isBroadcaster ? "broadcaster" : msg.userInfo.isMod ? "moderator" : "viewer";

        console.log(userType);
        if (streamerConfig.roles.includes(userType) || streamerConfig.roles.includes("all")) {
            const discordClient = DiscordBot.getClient()


            const channel = getDiscordChannel(discordClient, { guildId: streamerConfig.guildId, channelId: streamerConfig.channelId })

            if (!channel) return;

            sendMessageViaWebhook(channel, { user: msg.userInfo.displayName, message: clipUrl }, clipUrl);

        }

    } catch (error) {
        console.error(error);
    }

} 
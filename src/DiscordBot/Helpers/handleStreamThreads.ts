import { ChannelType, ForumChannel, Presence } from "discord.js";
import DiscordBot from "../DiscordBot";

async function handleStreamThreads(presense: Presence) {
    const client = DiscordBot.getClient()
  const guild = client.guilds.cache.get("1173586671451770880");
  const forum = await guild?.channels.fetch("1375180619641786560") as ForumChannel
  
  
  const streamer = presense.activities.find(a => a.name === "Twitch");
  if(streamer){
    const streamerName = streamer.url?.replace("https://www.twitch.tv/", "");
    if(!streamerName) return;
    console.log(streamerName)
    const thread = await forum.threads.cache.filter(t => t.name === streamerName)?.first() ||
    await forum.threads.create({
        name: streamerName,
        message: {
            content: `user: ${presense.user?.displayName} \n streamer: [${streamerName}](${streamer.url}) \n this is a live chat for their stream`
        }
    })
    
  }
  
  
}

export default handleStreamThreads;
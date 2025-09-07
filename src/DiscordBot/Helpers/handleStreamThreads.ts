import { ForumChannel, Presence } from "discord.js";
import DiscordBot from "../DiscordBot";

import { addStreamer } from "./handleAddStreamer";


async function handleStreamThreads(presense: Presence) {
    const client = DiscordBot.getClient()
  const guild = client.guilds.cache.get("1173586671451770880");
  const forum = await guild?.channels.fetch("1375180619641786560") as ForumChannel | null
  

  
  const streamer = presense.activities.find(a => a.name === "Twitch");
  const streamerName = streamer?.url?.replace("https://www.twitch.tv/", "");

  if(streamerName && streamer && guild?.id && forum){

  

    const thread = await forum.threads.cache.filter(t => t.name === streamerName)?.first()

    if(!thread){
      const newThread = await forum.threads.create({
        name: streamerName,
        message: {
            content: `user: <@${presense.user?.id}> \nstreamer: [${streamerName}](${streamer.url}) \nthis is a live chat for their stream`,
            flags: ["SuppressNotifications"]
        }
       
    })
    
  
    await addStreamer(streamerName, guild?.id, newThread.id)

    }
  }
  
  
}

export default handleStreamThreads;
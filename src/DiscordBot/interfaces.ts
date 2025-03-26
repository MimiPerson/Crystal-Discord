interface user {
  user: string;
  message: string;
  profilePictureUrl?: string;
}

interface streamer {
  channel: string;
  Guilds: guild[];
}
interface guild {
  guildId: string;
  channelId: string;
  updateLive?: boolean;
  channelNames: [string, string];
}
export type { user, streamer, guild };

interface user {
  user: string;
  message: string;
  profilePictureUrl: string | null;
}

interface streamer {
  channel: string;
  Guilds: guild[];
}
interface guild {
  guildId: string;
  channelId: string;
}
export type { user, streamer, guild };

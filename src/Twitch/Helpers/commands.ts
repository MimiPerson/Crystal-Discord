import TwitchClient from "../TwitchWebsocket";

// Utility functions for Twitch actions
async function raidChannel(channel: string): Promise<boolean | string> {
  const apiClient = await TwitchClient.getApiClient();
  if (!apiClient) return false;
  const CONFIG = TwitchClient.CONFIG;
  try {
    const raidChannel = await apiClient.users.getUserByName(channel);
    if (!raidChannel) return "Raid channel not found";

    await apiClient.raids.startRaid(CONFIG.userId, raidChannel.id);
    return true; // Raid started successfully
  } catch (error) {
    return false;
  }
}

async function unraidChannel(): Promise<boolean> {
  const apiClient = await TwitchClient.getApiClient();
  if (!apiClient) return false;
  const CONFIG = TwitchClient.CONFIG;
  try {
    await apiClient.raids.cancelRaid(CONFIG.userId);
    return true; // Unraid started successfully
  } catch (error) {
    return false;
  }
}

async function clearChat(): Promise<boolean> {
  const apiClient = await TwitchClient.getApiClient();
  if (!apiClient) return false;
  const CONFIG = TwitchClient.CONFIG;
  try {
    await apiClient.moderation.deleteChatMessages(CONFIG.userId);
    return true; // Chat cleared successfully
  } catch (error) {
    return false;
  }
}

export { raidChannel, unraidChannel, clearChat };

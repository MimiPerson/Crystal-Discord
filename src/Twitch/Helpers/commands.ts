import TwitchClient from "../TwitchWebsocket";

// Utility functions for Twitch actions
async function raidChannel(channel: string): Promise<boolean | string> {
  try {
    const apiClient = await TwitchClient.getApiClient();
    if (!apiClient) {
      throw new Error("API client not initialized");
    }
    const CONFIG = TwitchClient.CONFIG;
    
    const raidChannel = await apiClient.users.getUserByName(channel);
    if (!raidChannel) {
      throw new Error(`Raid channel "${channel}" not found`);
    }

    await apiClient.raids.startRaid(CONFIG.userId, raidChannel.id);
    return true; // Raid started successfully
  } catch (error) {
    console.error(`Error starting raid to channel ${channel}:`, error);
    return error instanceof Error ? error.message : "Failed to start raid";
  }
}

async function unraidChannel(): Promise<boolean> {
  try {
    const apiClient = await TwitchClient.getApiClient();
    if (!apiClient) {
      throw new Error("API client not initialized");
    }
    const CONFIG = TwitchClient.CONFIG;
    
    await apiClient.raids.cancelRaid(CONFIG.userId);
    return true; // Unraid started successfully
  } catch (error) {
    console.error("Error canceling raid:", error);
    return false;
  }
}

async function clearChat(): Promise<boolean> {
  try {
    const apiClient = await TwitchClient.getApiClient();
    if (!apiClient) {
      throw new Error("API client not initialized");
    }
    const CONFIG = TwitchClient.CONFIG;
    
    await apiClient.moderation.deleteChatMessages(CONFIG.userId);
    return true; // Chat cleared successfully
  } catch (error) {
    console.error("Error clearing chat:", error);
    return false;
  }
}

export { raidChannel, unraidChannel, clearChat };

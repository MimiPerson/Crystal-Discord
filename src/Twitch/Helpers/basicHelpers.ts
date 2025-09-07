import { HelixUser } from "@twurple/api";
import TwitchClient from "../TwitchWebsocket";

// Helper function to fetch user data
async function getUserData(user: string): Promise<HelixUser> {
  try {
    const userData = await TwitchClient.getApiClient().users.getUserByName(user);
    if (!userData) throw new Error(`User "${user}" not found`);
    return userData;
  } catch (error) {
    console.error(`Error fetching user data for ${user}:`, error);
    throw error;
  }
}
export { getUserData };

import { HelixUser } from "@twurple/api";
import TwitchClient from "../TwitchWebsocket";

// Helper function to fetch user data
async function getUserData(user: string): Promise<HelixUser> {
  const userData = await TwitchClient.getApiClient().users.getUserByName(user);
  if (!userData) throw new Error("User not found");
  return userData;
}
export { getUserData };

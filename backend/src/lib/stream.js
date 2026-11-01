import { StreamChat } from "stream-chat";
import "dotenv/config";

function streamCredentials() {
  if (process.env.STREAM_API_KEY && process.env.STREAM_API_SECRET) {
    return {
      key: process.env.STREAM_API_KEY,
      secret: process.env.STREAM_API_SECRET,
    };
  }

  if (process.env.STEAM_API_KEY && process.env.STEAM_API_SECRET) {
    console.warn(
      "STEAM_API_KEY and STEAM_API_SECRET are deprecated. Use STREAM_API_KEY and STREAM_API_SECRET."
    );
    return {
      key: process.env.STEAM_API_KEY,
      secret: process.env.STEAM_API_SECRET,
    };
  }

  throw new Error(
    "Missing Stream credentials. Set STREAM_API_KEY and STREAM_API_SECRET. STEAM_API_KEY and STEAM_API_SECRET are still accepted, but deprecated."
  );
}

const { key: apiKey, secret: apiSecret } = streamCredentials();
const streamClient = StreamChat.getInstance(apiKey, apiSecret);

export async function upsertStreamUser(userData) {
  await streamClient.upsertUsers([userData]);
  return userData;
}

export function generateStreamToken(userId) {
  return streamClient.createToken(userId.toString());
}

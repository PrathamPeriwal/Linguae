import { StreamChat } from "stream-chat";
import { env } from "../config/env.js";

const streamClient = StreamChat.getInstance(env.STREAM_API_KEY, env.STREAM_API_SECRET);

export async function upsertStreamUser(userData) {
  await streamClient.upsertUsers([userData]);
  return userData;
}

export function generateStreamToken(userId) {
  return streamClient.createToken(userId.toString());
}

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

function notifyError(error) {
  const name = error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : "";
  console.error(name, message);
}

// Resolves after the send finishes or fails. Never rejects. Callers must not await it on a request path.
export function notifyUser(userId, event) {
  return Promise.resolve()
    .then(() => streamClient.sendUserCustomEvent(String(userId), event))
    .catch(notifyError);
}

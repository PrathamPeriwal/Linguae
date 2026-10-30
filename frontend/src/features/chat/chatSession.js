let chatClient = null;
let generation = 0;

export function getChatGeneration() {
  return generation;
}

export function setChatClient(client) {
  chatClient = client;
}

export async function disconnectChat() {
  generation += 1;
  const client = chatClient;
  chatClient = null;
  if (!client?.userID) return;
  try {
    await client.disconnectUser();
  } catch (error) {
    console.error("Error disconnecting chat:", error);
  }
}

let videoClient = null;

export function setActiveVideoClient(client) {
  videoClient = client;
}

export async function disconnectVideo() {
  const client = videoClient;
  videoClient = null;
  if (!client) return;
  try {
    await client.disconnectUser();
  } catch (error) {
    console.error("Error disconnecting video:", error);
  }
}

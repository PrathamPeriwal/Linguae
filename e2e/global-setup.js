import { backendEnv, frontendDir, frontendStreamKey, npmCommand, run, seedDevDatabase, startServer, stopServer, waitForHealth } from "./runtime.js";

export default async function globalSetup() {
  backendEnv();
  const streamKey = frontendStreamKey();
  await run(npmCommand(), ["run", "build"], {
    cwd: frontendDir,
    env: { ...process.env, VITE_STREAM_API_KEY: streamKey },
    timeoutMs: 180000,
  });
  const pid = startServer();
  try {
    await waitForHealth();
    await seedDevDatabase();
  } catch (error) {
    stopServer();
    throw error;
  }
  if (!pid) throw new Error("The production server did not start");
}

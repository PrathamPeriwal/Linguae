import { backendEnv, seedDevDatabase, stopServer, waitUntilDown } from "./runtime.js";

export default async function globalTeardown() {
  backendEnv();
  stopServer();
  await waitUntilDown();
  await seedDevDatabase();
}

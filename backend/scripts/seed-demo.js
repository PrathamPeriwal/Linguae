import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../src/config/env.js";
import { closeDb, connectDB, sanitiseDbMessage } from "../src/lib/db.js";
import { streamClient } from "../src/lib/stream.js";
import FriendRequest from "../src/models/FriendRequest.js";
import User from "../src/models/User.js";
import { runSeed } from "../src/seed/demoData.js";

const backupDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../backups");

function option(name) {
  const prefix = `${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  if (!hit) return undefined;
  const value = hit.slice(prefix.length);
  return value === "" ? undefined : value;
}

function publicError(error) {
  const secret = process.env.DEMO_PASSWORD;
  let message = sanitiseDbMessage(error instanceof Error ? error.message : "Seed failed");
  if (typeof secret === "string" && secret.length >= 8) {
    message = message.split(secret).join("[redacted]");
  }
  return message || "Seed failed";
}

await connectDB();
let code = 0;
try {
  await runSeed({
    mongoose,
    models: { User, FriendRequest },
    stream: streamClient,
    env: {
      NODE_ENV: env.NODE_ENV,
      DEMO_PASSWORD: process.env.DEMO_PASSWORD,
    },
    backupDir,
    apply: process.argv.includes("--apply"),
    confirm: option("--confirm"),
    skipStream: process.argv.includes("--no-stream"),
    force: process.argv.includes("--force"),
  });
} catch (error) {
  console.error(publicError(error));
  code = 1;
} finally {
  try {
    await closeDb();
  } catch (error) {
    console.error(publicError(error));
    code = 1;
  }
}
process.exit(code);

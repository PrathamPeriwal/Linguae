import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import FriendRequest from "../src/models/FriendRequest.js";
import User from "../src/models/User.js";

export const looseLimits = { api: 10000, login: 10000, signup: 10000 };

export const profile = {
  fullName: "Verify Person",
  bio: "A short bio for the security check.",
  nativeLanguage: "english",
  learningLanguage: "spanish",
  location: "Test City",
  profilePic: "https://api.dicebear.com/9.x/lorelei/svg?seed=verify",
};

export async function startMongo() {
  let server;
  try {
    server = await MongoMemoryServer.create();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `mongodb-memory-server could not start its binary. Not using a real database. ${message}`,
      { cause: error }
    );
  }
  await mongoose.connect(server.getUri(), { serverSelectionTimeoutMS: 10000 });
  await Promise.all([User.init(), FriendRequest.init()]);
  return server;
}

export async function stopMongo(server) {
  try {
    await mongoose.disconnect();
  } catch {
    // The health test disconnects first.
  }
  if (server) await server.stop();
}

export async function clearMongo() {
  if (mongoose.connection.readyState !== 1) return;
  const collections = mongoose.connection.collections;
  for (const collection of Object.values(collections)) {
    await collection.deleteMany({});
  }
}

export function signupBody(overrides = {}) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    fullName: "Verify User",
    email: `user-${suffix}@example.com`,
    password: "verify-password-1",
    ...overrides,
  };
}

export function cookieLines(response) {
  const value = response.headers["set-cookie"];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function jwtCleared(lines) {
  const line = lines.find((item) => /^\s*jwt=/i.test(item));
  if (!line) return false;
  const pair = line.split(";")[0];
  const value = pair.slice(pair.indexOf("=") + 1).trim();
  if (value !== "") return false;
  const expires = /expires=([^;]+)/i.exec(line);
  if (expires) {
    const when = new Date(expires[1].trim());
    if (!Number.isNaN(when.getTime()) && when.getTime() <= Date.now()) return true;
  }
  const maxAge = /max-age=(-?\d+)/i.exec(line);
  return Boolean(maxAge && Number(maxAge[1]) <= 0);
}

export function has(object, key) {
  return (
    Boolean(object) &&
    typeof object === "object" &&
    Object.prototype.hasOwnProperty.call(object, key)
  );
}

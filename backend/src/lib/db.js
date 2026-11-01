import mongoose from "mongoose";
import { env } from "../config/env.js";
import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";

const indexedModels = [User, FriendRequest];

let logsEnabled = false;
let hooksBound = false;

export function sanitiseDbMessage(message) {
  return String(message ?? "")
    .replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[redacted]")
    .replace(/[^\s/:@]+:[^@\s/]+@/g, "[redacted]@");
}

function bindConnectionLogs() {
  if (hooksBound) return;
  hooksBound = true;

  mongoose.connection.on("error", (error) => {
    if (!logsEnabled) return;
    console.error(
      "MongoDB connection error:",
      error?.name || "Error",
      sanitiseDbMessage(error?.message)
    );
  });

  mongoose.connection.on("disconnected", () => {
    if (!logsEnabled) return;
    console.error("MongoDB disconnected");
  });
}

export function getDbState() {
  return mongoose.connection.readyState;
}

function logIndexFailure(model, error) {
  console.error(
    "Index build failed:",
    model.modelName,
    error?.name || "Error",
    sanitiseDbMessage(error?.message)
  );
}

export async function ensureIndexes() {
  for (const model of indexedModels) {
    if (model.listenerCount("error") === 0) {
      model.on("error", (error) => logIndexFailure(model, error));
    }
    try {
      await model.init();
    } catch (error) {
      logIndexFailure(model, error);
    }
  }
}

export async function connectDB() {
  bindConnectionLogs();
  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    logsEnabled = true;
    const host = mongoose.connection.host;
    const name = mongoose.connection.name;
    console.log(`MongoDB connected (host: ${host}, database: ${name})`);
    await ensureIndexes();
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error?.name || "Error",
      sanitiseDbMessage(error?.message)
    );
    process.exit(1);
  }
}

export async function closeDb() {
  logsEnabled = false;
  await mongoose.connection.close(false);
}

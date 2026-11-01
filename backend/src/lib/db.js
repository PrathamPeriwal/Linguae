import mongoose from "mongoose";
import { env } from "../config/env.js";

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

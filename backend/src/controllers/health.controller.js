import mongoose from "mongoose";
import { getDbState } from "../lib/db.js";

const PING_TIMEOUT_MS = 2000;

function pingDatabase() {
  const database = mongoose.connection.db;
  if (!database) return Promise.reject(new Error("Database handle is not ready"));

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Database ping timed out"));
    }, PING_TIMEOUT_MS);

    database
      .admin()
      .ping()
      .then(
        (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
  });
}

export async function health(_req, res) {
  const uptime = Math.floor(process.uptime());
  if (getDbState() !== 1) {
    res.status(503).json({ status: "degraded", db: "down", uptime });
    return;
  }

  try {
    await pingDatabase();
    res.status(200).json({ status: "ok", db: "up", uptime });
  } catch {
    res.status(503).json({ status: "degraded", db: "down", uptime });
  }
}

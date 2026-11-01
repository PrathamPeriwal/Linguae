import { app } from "./app.js";
import { env } from "./config/env.js";
import { closeDb, connectDB } from "./lib/db.js";

let server;
let shuttingDown = false;

function logProcessError(label, error) {
  const err = error instanceof Error ? error : new Error(String(error));
  if (env.NODE_ENV === "development") {
    console.error(label, err.name, err.message, err.stack);
  } else {
    console.error(label, err.name, err.message);
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  const forced = setTimeout(() => {
    console.error("Forced exit after 10 seconds");
    process.exit(1);
  }, 10_000);
  forced.unref();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await closeDb();
    clearTimeout(forced);
    process.exit(0);
  } catch (error) {
    logProcessError("shutdown", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("unhandledRejection", (reason) => {
  logProcessError("unhandledRejection", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logProcessError("uncaughtException", error);
  const finish = () => process.exit(1);
  const timer = setTimeout(finish, 1000);
  timer.unref();
  if (!server) {
    finish();
    return;
  }
  server.close(() => {
    closeDb().finally(finish);
  });
});

await connectDB();

server = app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});

server.on("error", (error) => {
  logProcessError("listen", error);
  process.exit(1);
});

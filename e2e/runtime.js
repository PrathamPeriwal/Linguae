import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertDevDatabase, loadEnvFile } from "./env-file.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(here, "..");
export const backendDir = path.join(repoRoot, "backend");
export const frontendDir = path.join(repoRoot, "frontend");
export const runtimeDir = path.join(here, ".runtime");
export const pidFile = path.join(runtimeDir, "server.json");
export const BASE_URL = "http://127.0.0.1:5099";

export function backendEnv() {
  const env = loadEnvFile(path.join(backendDir, ".env"));
  assertDevDatabase(env);
  return env;
}

export function frontendStreamKey() {
  const env = loadEnvFile(path.join(frontendDir, ".env"));
  if (!env.VITE_STREAM_API_KEY) {
    throw new Error("STOP: VITE_STREAM_API_KEY is missing from frontend/.env");
  }
  return env.VITE_STREAM_API_KEY;
}

function redact(text) {
  return String(text)
    .replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[redacted]")
    .replace(/[^\s/:@]+:[^@\s/]+@/g, "[redacted]@");
}

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const shell = options.shell ?? (process.platform === "win32" && /\.(cmd|bat)$/i.test(command));
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: options.stdio || "inherit",
      windowsHide: true,
      shell,
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${path.basename(command)} timed out`));
    }, options.timeoutMs || 180000);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} exited ${code}`));
    });
  });
}

export function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export async function seedDevDatabase() {
  const env = backendEnv();
  const args = ["scripts/seed-demo.js", "--apply", `--confirm=${env.MONGO_DB_NAME}`];
  if (env.NODE_ENV === "production") args.push("--force");
  const childEnv = { ...process.env };
  delete childEnv.NODE_ENV;
  await run(process.execPath, args, {
    cwd: backendDir,
    env: childEnv,
    timeoutMs: 180000,
  });
}

export async function waitForHealth() {
  const deadline = Date.now() + 60000;
  let last = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      const body = await response.json().catch(() => null);
      if (response.ok && body?.status === "ok" && body?.db === "up") return;
      last = `status ${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.name : "fetch failed";
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  let log = "";
  try {
    log = redact(readFileSync(path.join(runtimeDir, "server.log"), "utf8")).slice(-1500);
  } catch {
    log = "";
  }
  throw new Error(`GET /api/health did not return ok (${last}). ${log}`.trim());
}

export function startServer() {
  mkdirSync(runtimeDir, { recursive: true });
  const logFd = openSync(path.join(runtimeDir, "server.log"), "w");
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: backendDir,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: "5099",
      JWT_SECRET_KEY: randomBytes(48).toString("hex"),
      CSP_ENFORCE: "true",
      RATE_LIMIT_API: "5000",
      RATE_LIMIT_LOGIN: "100",
      RATE_LIMIT_SIGNUP: "100",
    },
    detached: true,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
  });
  child.unref();
  writeFileSync(pidFile, JSON.stringify({ pid: child.pid }));
  return child.pid;
}

export function stopServer() {
  let pid;
  try {
    pid = JSON.parse(readFileSync(pidFile, "utf8")).pid;
  } catch {
    return;
  }
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }
}

export async function waitUntilDown() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      await fetch(`${BASE_URL}/api/health`);
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

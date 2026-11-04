import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runEnv(overrides) {
  const dir = mkdtempSync(path.join(tmpdir(), "linguae-env-"));
  const file = path.join(dir, "empty.env");
  writeFileSync(file, "");
  return spawnSync(process.execPath, ["src/config/env.js"], {
    cwd: backendRoot,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      PATHEXT: process.env.PATHEXT,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      DOTENV_CONFIG_PATH: file,
      ...overrides,
    },
  });
}

it("exits 1 and names missing or short variables without printing values", () => {
  const sentinel = "super-secret-stream-key";
  const result = runEnv({
    NODE_ENV: "production",
    PORT: "5001",
    JWT_SECRET_KEY: "short",
    STREAM_API_KEY: sentinel,
  });
  const output = `${result.stdout}\n${result.stderr}`;
  expect(result.status).toBe(1);
  expect(output).toContain("MONGO_URI");
  expect(output).toContain("STREAM_API_SECRET");
  expect(output).toContain("JWT_SECRET_KEY");
  expect(output).toContain("at least 32 characters");
  expect(output).not.toContain(sentinel);
  expect(output).not.toContain("short");
  expect(output).not.toMatch(/mongodb(\+srv)?:\/\//);
});

it("rejects an invalid port without echoing it", () => {
  const result = runEnv({
    NODE_ENV: "development",
    PORT: "not-a-port",
    MONGO_URI: "mongodb://127.0.0.1:27017/example",
    JWT_SECRET_KEY: "dev-secret",
    STREAM_API_KEY: "key",
    STREAM_API_SECRET: "secret",
  });
  const output = `${result.stdout}\n${result.stderr}`;
  expect(result.status).toBe(1);
  expect(output).toContain("PORT");
  expect(output).not.toContain("not-a-port");
});

it("allows a short JWT outside production", () => {
  const result = runEnv({
    NODE_ENV: "development",
    MONGO_URI: "mongodb://127.0.0.1:27017/example",
    JWT_SECRET_KEY: "short",
    STREAM_API_KEY: "key",
    STREAM_API_SECRET: "secret",
  });
  const output = `${result.stdout}\n${result.stderr}`;
  expect(result.status).toBe(0);
  expect(output).not.toContain("mongodb://");
  expect(output).not.toContain("short");
});

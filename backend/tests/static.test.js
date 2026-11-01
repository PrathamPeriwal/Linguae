import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { asyncHandler } from "../src/utils/asyncHandler.js";

vi.mock("../src/lib/stream.js", () => ({
  upsertStreamUser: vi.fn(async (user) => user),
  generateStreamToken: vi.fn((userId) => `test-token-${userId}`),
}));

const dist = mkdtempSync(path.join(tmpdir(), "linguae-dist-"));
const fixture = "<!doctype html><title>fixture</title>";
let app;
let errorHandler;

beforeAll(async () => {
  mkdirSync(path.join(dist, "assets"));
  writeFileSync(path.join(dist, "index.html"), fixture);
  writeFileSync(path.join(dist, "assets", "app.js"), "console.log('asset')");
  process.env.NODE_ENV = "production";
  vi.resetModules();
  const loaded = await import("../src/app.js");
  app = loaded.createApp({ distPath: dist });
  errorHandler = (await import("../src/middleware/error.middleware.js")).errorHandler;
});

afterAll(() => {
  process.env.NODE_ENV = "test";
  rmSync(dist, { recursive: true, force: true });
});

it("serves the SPA with the production cache rules", async () => {
  const home = await request(app).get("/");
  expect(home.status).toBe(200);
  expect(home.text).toBe(fixture);
  expect(home.headers["cache-control"]).toBe("no-cache");

  const deep = await request(app).get("/chats/someone");
  expect(deep.status).toBe(200);
  expect(deep.text).toBe(fixture);
  expect(deep.headers["cache-control"]).toBe("no-cache");

  const asset = await request(app).get("/assets/app.js");
  expect(asset.status).toBe(200);
  expect(asset.text).toContain("asset");
  expect(asset.headers["cache-control"]).toBe("public, max-age=31536000, immutable");

  const missing = await request(app).get("/assets/nope.js");
  expect(missing.status).toBe(404);
  expect(missing.text).not.toContain("fixture");

  const api = await request(app).get("/api/not-a-route");
  expect(api.status).toBe(404);
  expect(api.body).toEqual({ message: "Not found" });
  expect(api.text).not.toContain("fixture");
});

it("does not allow a cross-origin browser when FRONTEND_ORIGINS is unset", async () => {
  const response = await request(app).get("/").set("Origin", "http://localhost:5173");
  expect(response.status).toBe(403);
  expect(response.body).toEqual({ message: "Origin not allowed" });
});

it("allows the SPA origin on the same host", async () => {
  const response = await request(app)
    .get("/api/not-a-route")
    .set("Host", "linguae.example")
    .set("Origin", "http://linguae.example");
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ message: "Not found" });
});

it("hides internal error details in production", async () => {
  const mini = express();
  mini.get(
    "/boom",
    asyncHandler(async () => {
      throw new Error("internal database failure");
    })
  );
  mini.use(errorHandler);
  const response = await request(mini).get("/boom");
  expect(response.status).toBe(500);
  expect(response.body).toEqual({ message: "Internal Server Error" });
  expect(response.text).not.toContain("internal database failure");
  expect(response.body.stack).toBeUndefined();
});

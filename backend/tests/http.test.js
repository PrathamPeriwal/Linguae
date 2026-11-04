import http from "node:http";
import { once } from "node:events";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { errorHandler } from "../src/middleware/error.middleware.js";
import { sanitiseDbMessage } from "../src/lib/db.js";
import User from "../src/models/User.js";
import { asyncHandler } from "../src/utils/asyncHandler.js";
import { looseLimits, signupBody, startMongo, stopMongo } from "./helpers.js";

vi.mock("../src/lib/stream.js", () => ({
  upsertStreamUser: vi.fn(async (user) => user),
  generateStreamToken: vi.fn((userId) => `test-token-${userId}`),
  notifyUser: vi.fn(() => Promise.resolve()),
}));

let app;
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  app = createApp({ limits: looseLimits });
});

afterAll(async () => {
  await stopMongo(mongo);
});

it("strips connection strings from database errors", () => {
  const cleaned = sanitiseDbMessage(
    "connect failed mongodb+srv://app-user:topsecret@cluster.example.net/linguae"
  );
  expect(cleaned.includes("topsecret")).toBe(false);
  expect(cleaned.includes("app-user")).toBe(false);
  expect(cleaned.includes("[redacted]")).toBe(true);
});

it("allows the development origin, rejects another origin, and allows a missing Origin", async () => {
  const allowed = await request(app).get("/api/health").set("Origin", "http://localhost:5173");
  expect(allowed.status).toBe(200);
  expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  expect(allowed.headers["access-control-allow-credentials"]).toBe("true");

  const blocked = await request(app).get("/api/health").set("Origin", "https://evil.example");
  expect(blocked.status).toBe(403);
  expect(blocked.body).toEqual({ message: "Origin not allowed" });

  const sameProcess = await request(app).get("/api/health");
  expect(sameProcess.status).toBe(200);
  expect(sameProcess.headers["access-control-allow-origin"]).toBeUndefined();
});

it("returns 400 for malformed JSON and 413 for a body over 10kb", async () => {
  const malformed = await request(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send("{");
  expect(malformed.status).toBe(400);
  expect(malformed.body).toEqual({ message: "Invalid JSON" });
  expect(malformed.text).not.toContain("stack");

  const oversized = await request(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send(JSON.stringify({ email: "a@b.co", password: "p".repeat(20_000) }));
  expect(oversized.status).toBe(413);
  expect(oversized.body).toEqual({ message: "Payload too large" });
  expect(oversized.body.stack).toBeUndefined();
});

it("returns JSON 404 for an unknown /api path", async () => {
  const response = await request(app).get("/api/does-not-exist");
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ message: "Not found" });
  expect(response.headers["content-type"]).toMatch(/json/);
});

it("maps CastError, ValidationError, and duplicate keys to 400", async () => {
  const mini = express();
  mini.use(express.json());
  mini.get(
    "/cast",
    asyncHandler(() => {
      throw new mongoose.Error.CastError("ObjectId", "nope", "_id");
    })
  );
  mini.get("/valid", (_req, _res, next) => {
    next(new mongoose.Error.ValidationError());
  });
  mini.get("/dup", (_req, _res, next) => {
    const error = new Error("E11000 duplicate key");
    error.code = 11000;
    next(error);
  });
  mini.use(errorHandler);

  const cast = await request(mini).get("/cast");
  expect(cast.status).toBe(400);
  expect(cast.body).toEqual({ message: "Invalid input" });

  const valid = await request(mini).get("/valid");
  expect(valid.status).toBe(400);
  expect(valid.body).toEqual({ message: "Invalid input" });

  const duplicate = await request(mini).get("/dup");
  expect(duplicate.status).toBe(400);
  expect(duplicate.body).toEqual({ message: "Duplicate value" });
});

it("compresses a large JSON response", async () => {
  const signup = await request(app).post("/api/auth/signup").send(signupBody());
  expect(signup.status).toBe(201);
  const setCookie = signup.headers["set-cookie"];
  const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie])
    .map((line) => line.split(";")[0])
    .join("; ");

  await User.collection.insertMany(
    Array.from({ length: 30 }, (_unused, index) => ({
      fullName: `Learner ${index}`,
      email: `learner-${index}@example.com`,
      password: "not-a-login",
      bio: "b".repeat(400),
      profilePic: "",
      nativeLanguage: "english",
      learningLanguage: "spanish",
      location: "City",
      isOnboarded: true,
      friends: [],
    }))
  );

  const server = http.createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const { port } = server.address();
    const response = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/users",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip",
            Cookie: cookie,
          },
        },
        resolve
      );
      req.on("error", reject);
      req.end();
    });
    const chunks = [];
    for await (const chunk of response) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-encoding"]).toBe("gzip");
    expect(body[0]).toBe(0x1f);
    expect(body[1]).toBe(0x8b);
  } finally {
    server.close();
  }
});

it("reports health up when connected and degraded when disconnected", async () => {
  const up = await request(app).get("/api/health");
  expect(up.status).toBe(200);
  expect(up.body).toMatchObject({ status: "ok", db: "up" });
  expect(up.body.uptime).toEqual(expect.any(Number));
  expect(Object.keys(up.body).sort()).toEqual(["db", "status", "uptime"]);
  expect(up.headers["content-security-policy-report-only"]).toBeTruthy();
  expect(up.headers["content-security-policy"]).toBeUndefined();
  expect(up.headers["permissions-policy"]).toContain("camera=(self)");
  expect(up.headers["permissions-policy"]).toContain("microphone=(self)");

  await mongoose.disconnect();
  const down = await request(app).get("/api/health");
  expect(down.status).toBe(503);
  expect(down.body).toMatchObject({ status: "degraded", db: "down" });
  expect(down.body.uptime).toEqual(expect.any(Number));
});

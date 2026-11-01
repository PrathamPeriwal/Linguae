import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import { env } from "../src/config/env.js";
import { createApp } from "../src/app.js";
import User from "../src/models/User.js";
import {
  clearMongo,
  cookieLines,
  has,
  jwtCleared,
  looseLimits,
  profile,
  signupBody,
  startMongo,
  stopMongo,
} from "./helpers.js";

vi.mock("../src/lib/stream.js", () => ({
  upsertStreamUser: vi.fn(async (user) => user),
  generateStreamToken: vi.fn((userId) => `test-token-${userId}`),
}));

let app;
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  app = createApp({ limits: looseLimits });
});

afterEach(clearMongo);

afterAll(async () => {
  await stopMongo(mongo);
});

function usersLeak(body) {
  if (!Array.isArray(body)) return true;
  return body.some(
    (user) =>
      user &&
      typeof user === "object" &&
      ["email", "password", "friends", "isOnboarded"].some((key) => has(user, key))
  );
}

function noneToken(userId) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ userId: String(userId) })).toString("base64url");
  return `${header}.${payload}.`;
}

it("covers the verify:security checks", async () => {
  const email = `verify-${Date.now()}@example.com`;
  const password = "verify-password-1";
  const agent = request.agent(app);

  const badLogin = await agent
    .post("/api/auth/login")
    .send({ email: { $ne: null }, password: "whatever" });
  expect(badLogin.status).toBe(400);

  const signup = await agent
    .post("/api/auth/signup")
    .send({ fullName: "Verify User", email, password });
  expect(signup.status).toBe(201);
  expect(has(signup.body.user, "password")).toBe(false);

  const me = await agent.get("/api/auth/me");
  expect(me.status).toBe(200);
  expect(has(me.body.user, "password")).toBe(false);
  expect(has(me.body.user, "__v")).toBe(false);

  const users = await agent.get("/api/users");
  expect(users.status).toBe(200);
  expect(usersLeak(users.body)).toBe(false);

  const sameLanguage = await agent.post("/api/auth/onboarding").send({
    ...profile,
    nativeLanguage: "english",
    learningLanguage: "english",
  });
  expect(sameLanguage.status).toBe(400);
  expect(sameLanguage.body.message).toBe("Choose a different language to learn.");

  const extra = await agent.post("/api/auth/onboarding").send({
    ...profile,
    friends: ["000000000000000000000000"],
    email: "hacked@example.com",
    password: "hacked-password",
    isOnboarded: false,
    $set: { email: "hacked@example.com" },
  });
  const after = await agent.get("/api/auth/me");
  const friends = await agent.get("/api/users/friends");
  const stillLogsIn = await agent.post("/api/auth/login").send({ email, password });
  expect(extra.status).toBe(200);
  expect(after.status).toBe(200);
  expect(after.body.user.email).toBe(email);
  expect(after.body.user.isOnboarded).toBe(true);
  expect(after.body.user.fullName).toBe(profile.fullName);
  expect(after.body.user.bio).toBe(profile.bio);
  expect(after.body.user.nativeLanguage).toBe("english");
  expect(after.body.user.learningLanguage).toBe("spanish");
  expect(after.body.user.location).toBe(profile.location);
  expect(after.body.user.profilePic).toBe(profile.profilePic);
  expect(has(after.body.user, "password")).toBe(false);
  expect(has(after.body.user, "friends")).toBe(false);
  expect(has(after.body.user, "__v")).toBe(false);
  expect(friends.body).toEqual([]);
  expect(stillLogsIn.status).toBe(200);
  expect(has(stillLogsIn.body.user, "password")).toBe(false);

  const badId = await agent.post("/api/users/friend-request/not-an-id");
  expect(badId.status).toBe(400);
  expect(badId.body.message).toBe("Invalid id");

  const logout = await agent.post("/api/auth/logout");
  expect(logout.status).toBe(200);
  expect(jwtCleared(cookieLines(logout))).toBe(true);

  const loggedOut = await agent.get("/api/auth/me");
  expect(loggedOut.status).toBe(401);
});

it("rejects non-string signup and login values", async () => {
  const signup = await request(app).post("/api/auth/signup").send({
    email: { $gt: "" },
    password: { length: 8 },
    fullName: ["Ann"],
  });
  expect(signup.status).toBe(400);
  expect(signup.body.message).toBe("All fields are required");

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: ["ann@example.com"], password: 123456 });
  expect(login.status).toBe(400);
  expect(login.body.message).toBe("All fields are required");
});

it("rejects passwords longer than 72 bytes and accepts 72 bytes", async () => {
  const tooManyBytes = "é".repeat(37);
  expect(tooManyBytes.length).toBeLessThanOrEqual(72);
  expect(Buffer.byteLength(tooManyBytes)).toBeGreaterThan(72);

  const rejected = await request(app).post("/api/auth/signup").send(
    signupBody({ email: "bytes-long@example.com", password: tooManyBytes })
  );
  expect(rejected.status).toBe(400);
  expect(rejected.body.message).toBe("Password must be at most 72 characters");

  const tooManyChars = await request(app).post("/api/auth/signup").send(
    signupBody({ email: "chars-long@example.com", password: "a".repeat(73) })
  );
  expect(tooManyChars.status).toBe(400);
  expect(tooManyChars.body.message).toBe("Password must be at most 72 characters");

  const exact = await request(app).post("/api/auth/signup").send(
    signupBody({ email: "bytes-ok@example.com", password: "é".repeat(36) })
  );
  expect(Buffer.byteLength("é".repeat(36))).toBe(72);
  expect(exact.status).toBe(201);
});

it("does not apply the byte cap on login", async () => {
  const login = await request(app).post("/api/auth/login").send({
    email: "nobody-bytes@example.com",
    password: "é".repeat(40),
  });
  expect(login.status).toBe(401);
  expect(login.body.message).toBe("Invalid email or password");
});

it("rejects a duplicate email", async () => {
  const body = signupBody({ email: "duplicate@example.com" });
  const first = await request(app).post("/api/auth/signup").send(body);
  const second = await request(app).post("/api/auth/signup").send(body);
  expect(first.status).toBe(201);
  expect(second.status).toBe(400);
  expect(second.body.message).toBe("Email already exists, please use a different one");
});

it("lets one of two parallel signups win", async () => {
  const body = signupBody({ email: "parallel@example.com" });
  const [first, second] = await Promise.all([
    request(app).post("/api/auth/signup").send(body),
    request(app).post("/api/auth/signup").send(body),
  ]);
  const statuses = [first.status, second.status].sort();
  expect(statuses).toEqual([201, 400]);
  const failed = first.status === 400 ? first : second;
  expect(failed.body.message).toBe("Email already exists, please use a different one");
});

it("stores and looks up the lowercased email", async () => {
  const signup = await request(app).post("/api/auth/signup").send(
    signupBody({ email: "  Mixed.Case@Example.COM " })
  );
  expect(signup.status).toBe(201);
  expect(signup.body.user.email).toBe("mixed.case@example.com");

  const login = await request(app).post("/api/auth/login").send({
    email: "MIXED.CASE@example.com",
    password: "verify-password-1",
  });
  expect(login.status).toBe(200);
  expect(login.body.user.email).toBe("mixed.case@example.com");
});

it("compares a password even when the email is unknown", async () => {
  const spy = vi.spyOn(bcrypt, "compare");
  const login = await request(app).post("/api/auth/login").send({
    email: "missing@example.com",
    password: "whatever1",
  });
  expect(login.status).toBe(401);
  expect(login.body.message).toBe("Invalid email or password");
  expect(spy).toHaveBeenCalled();
  spy.mockRestore();
});

it("rejects missing, expired, wrong-algorithm, none, and deleted-user tokens", async () => {
  const missing = await request(app).get("/api/auth/me");
  expect(missing.status).toBe(401);
  expect(missing.body.message).toBe("Unauthorized - No token provided");

  const signup = await request(app).post("/api/auth/signup").send(signupBody());
  const userId = signup.body.user._id;
  expect(signup.status).toBe(201);

  const expired = jwt.sign(
    { userId, exp: Math.floor(Date.now() / 1000) - 10 },
    env.JWT_SECRET_KEY,
    { algorithm: "HS256" }
  );
  const expiredResponse = await request(app).get("/api/auth/me").set("Cookie", `jwt=${expired}`);
  expect(expiredResponse.status).toBe(401);
  expect(expiredResponse.body.message).toBe("Unauthorized - Invalid token");

  const wrongAlgorithm = jwt.sign({ userId }, env.JWT_SECRET_KEY, { algorithm: "HS384" });
  const wrongResponse = await request(app)
    .get("/api/auth/me")
    .set("Cookie", `jwt=${wrongAlgorithm}`);
  expect(wrongResponse.status).toBe(401);
  expect(wrongResponse.body.message).toBe("Unauthorized - Invalid token");

  const noneResponse = await request(app)
    .get("/api/auth/me")
    .set("Cookie", `jwt=${noneToken(userId)}`);
  expect(noneResponse.status).toBe(401);
  expect(noneResponse.body.message).toBe("Unauthorized - Invalid token");

  await User.deleteOne({ _id: userId });
  const token = jwt.sign({ userId }, env.JWT_SECRET_KEY, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
  const deleted = await request(app).get("/api/auth/me").set("Cookie", `jwt=${token}`);
  expect(deleted.status).toBe(401);
  expect(deleted.body.message).toBe("Unauthorized - User not found");
});

import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { onboardSchema } from "../src/controllers/auth.controller.js";
import { getDbName } from "../src/lib/db.js";
import FriendRequest from "../src/models/FriendRequest.js";
import User from "../src/models/User.js";
import { runSeed } from "../src/seed/demoData.js";
import { clearMongo, looseLimits, startMongo, stopMongo } from "./helpers.js";

vi.mock("../src/lib/stream.js", () => ({
  upsertStreamUser: vi.fn(async (user) => user),
  generateStreamToken: vi.fn((userId) => `test-token-${userId}`),
  notifyUser: vi.fn(() => Promise.resolve()),
  streamClient: {},
}));

const PASSWORD = "demo-pass-99";
const NOW = new Date("2026-06-01T12:00:00.000Z");
const LOGIN = ["maya@linguae.demo", "lucia@linguae.demo", "kenji@linguae.demo"];
const OTHERS = [
  "anna@linguae.demo",
  "pierre@linguae.demo",
  "sofia@linguae.demo",
  "olga@linguae.demo",
  "hana@linguae.demo",
  "wei@linguae.demo",
  "layla@linguae.demo",
];

let mongo;
let app;
const dirs = [];

function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), "linguae-seed-"));
  dirs.push(dir);
  return dir;
}

function channelId(a, b) {
  return [String(a), String(b)].sort().join("-");
}

function pairKey(a, b) {
  const left = String(a);
  const right = String(b);
  return left < right ? `${left}_${right}` : `${right}_${left}`;
}

function mockStream(tagged = []) {
  const ops = [];
  return {
    ops,
    queryUsers: vi.fn(async () => ({ users: tagged.map((id) => ({ id })) })),
    deleteUsers: vi.fn(async (userIds, options) => {
      ops.push({ op: "deleteUsers", userIds, options });
      return { task_id: "task-1" };
    }),
    getTask: vi.fn(async () => ({ task_id: "task-1", status: "completed" })),
    upsertUsers: vi.fn(async (users) => {
      ops.push({ op: "upsertUsers", users });
      return { users };
    }),
    channel(type, id, data) {
      return {
        create: vi.fn(async () => {
          ops.push({ op: "create", id, data, type });
        }),
        sendMessage: vi.fn(async (message, options) => {
          ops.push({ op: "message", id, message, options });
          return {
            message: {
              id: `m-${ops.length}`,
              text: message.text,
              created_at: message.created_at || new Date().toISOString(),
            },
          };
        }),
        markRead: vi.fn(async (options) => {
          ops.push({ op: "markRead", id, userId: options?.user_id });
        }),
      };
    },
  };
}

function seedArgs(stream, lines, overrides = {}) {
  return {
    mongoose,
    models: { User, FriendRequest },
    stream,
    env: { NODE_ENV: "test", DEMO_PASSWORD: PASSWORD },
    log: (line) => lines.push(line),
    now: NOW,
    backupDir: tempDir(),
    apply: false,
    confirm: getDbName(),
    ...overrides,
  };
}

async function sentinel() {
  await User.create({
    fullName: "Sentinel User",
    email: "sentinel@example.com",
    password: "sentinel-password",
    isOnboarded: false,
  });
}

beforeAll(async () => {
  mongo = await startMongo();
  app = createApp({ limits: looseLimits });
});

beforeEach(clearMongo);

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs.length = 0;
});

afterAll(async () => {
  await stopMongo(mongo);
});

it("dry run changes nothing", async () => {
  await sentinel();
  const lines = [];
  const stream = mockStream(["tagged-stream-user"]);
  const args = seedArgs(stream, lines);
  const result = await runSeed(args);
  expect(result.applied).toBe(false);
  expect(getDbName()).toBe(mongoose.connection.name);
  if (process.env.MONGO_DB_NAME) expect(getDbName()).not.toBe(process.env.MONGO_DB_NAME);
  expect(await User.countDocuments()).toBe(1);
  expect(await FriendRequest.countDocuments()).toBe(0);
  expect(readdirSync(args.backupDir)).toEqual([]);
  expect(stream.deleteUsers).not.toHaveBeenCalled();
  expect(stream.upsertUsers).not.toHaveBeenCalled();
  expect(stream.queryUsers).toHaveBeenCalled();
  const output = lines.join("\n");
  expect(output).toContain("Dry run");
  expect(output).toContain(getDbName());
  expect(output.includes(PASSWORD)).toBe(false);
  expect(output).not.toMatch(/mongodb(\+srv)?:\/\//);
});

it("apply without confirm or with the wrong confirm refuses", async () => {
  await sentinel();
  const stream = mockStream();
  const lines = [];
  await expect(
    runSeed(seedArgs(stream, lines, { apply: true, confirm: undefined }))
  ).rejects.toThrow(/confirm/);
  await expect(
    runSeed(seedArgs(stream, lines, { apply: true, confirm: "not-the-database" }))
  ).rejects.toThrow(/confirm/);
  expect(await User.countDocuments()).toBe(1);
  expect(stream.deleteUsers).not.toHaveBeenCalled();
});

it("refuses a short or missing DEMO_PASSWORD", async () => {
  for (const demo of [undefined, "", "short"]) {
    await clearMongo();
    await sentinel();
    await expect(
      runSeed(
        seedArgs(mockStream(), [], {
          env: { NODE_ENV: "test", DEMO_PASSWORD: demo },
          apply: true,
        })
      )
    ).rejects.toThrow(/DEMO_PASSWORD/);
    expect(await User.countDocuments()).toBe(1);
  }
});

it("refuses production without --force", async () => {
  await sentinel();
  const stream = mockStream();
  await expect(
    runSeed(
      seedArgs(stream, [], {
        env: { NODE_ENV: "production", DEMO_PASSWORD: PASSWORD },
        apply: true,
        force: false,
      })
    )
  ).rejects.toThrow(/production/);
  expect(await User.countDocuments()).toBe(1);
  expect(stream.deleteUsers).not.toHaveBeenCalled();
});

it("applies the demo data, and a second run still leaves 10 users", async () => {
  const oldA = await User.create({
    fullName: "Old A",
    email: "old-a@example.com",
    password: "old-password-9",
    isOnboarded: true,
    bio: "Old bio.",
    nativeLanguage: "english",
    learningLanguage: "spanish",
    location: "Old City",
  });
  const oldB = await User.create({
    fullName: "Old B",
    email: "old-b@example.com",
    password: "old-password-9",
    isOnboarded: true,
    bio: "Old bio.",
    nativeLanguage: "spanish",
    learningLanguage: "english",
    location: "Old Town",
  });
  await FriendRequest.create({ sender: oldA._id, recipient: oldB._id, status: "pending" });
  await mongoose.connection.collection("system_heartbeat").insertOne({
    _id: "main",
    lastBeatAt: new Date("2026-01-01T00:00:00.000Z"),
    beats: 4,
  });

  const lines = [];
  const stream = mockStream(["tagged-stream-user"]);
  const args = seedArgs(stream, lines, { apply: true });
  const result = await runSeed(args);
  expect(result.applied).toBe(true);
  expect(lines.join("\n").includes(PASSWORD)).toBe(false);

  const backupText = readFileSync(result.backupPath, "utf8");
  const backup = JSON.parse(backupText);
  expect(backup.users).toHaveLength(2);
  expect(backup.friendRequests).toHaveLength(1);
  expect(backupText.includes("old-password-9")).toBe(false);
  expect(backupText.includes(PASSWORD)).toBe(false);
  expect(backupText).toMatch(/\$2[ab]\$/);
  if (process.platform !== "win32") {
    expect(statSync(result.backupPath).mode & 0o777).toBe(0o600);
  }

  const beat = await mongoose.connection.collection("system_heartbeat").findOne({ _id: "main" });
  expect(beat.beats).toBe(4);
  expect(new Date(beat.lastBeatAt).toISOString()).toBe("2026-01-01T00:00:00.000Z");

  expect(await User.countDocuments()).toBe(10);
  expect(await FriendRequest.countDocuments()).toBe(11);
  const users = await User.find().select("+password");
  const byEmail = new Map(users.map((user) => [user.email, user]));
  expect([...byEmail.keys()].sort()).toEqual([...LOGIN, ...OTHERS].sort());

  for (const user of users) {
    const parsed = onboardSchema.safeParse({
      fullName: user.fullName,
      bio: user.bio,
      nativeLanguage: user.nativeLanguage,
      learningLanguage: user.learningLanguage,
      location: user.location,
      profilePic: user.profilePic,
    });
    expect(parsed.success).toBe(true);
    expect(user.isOnboarded).toBe(true);
    expect(user.bio.length).toBeLessThan(300);
    expect(user.profilePic).toBe(`https://api.dicebear.com/9.x/lorelei/svg?seed=${user._id}`);
    expect(user.password).not.toBe(PASSWORD);
    expect(String(user.password).startsWith("$2")).toBe(true);
    expect(new Date(user.createdAt).getTime()).toBeLessThan(NOW.getTime());
    const friendIds = user.friends.map(String);
    expect(new Set(friendIds).size).toBe(friendIds.length);
    for (const friendId of friendIds) {
      const other = users.find((item) => String(item._id) === friendId);
      expect(other.friends.map(String)).toContain(String(user._id));
    }
  }

  const maya = byEmail.get("maya@linguae.demo");
  const lucia = byEmail.get("lucia@linguae.demo");
  const kenji = byEmail.get("kenji@linguae.demo");
  expect(maya.friends.map(String)).not.toContain(String(byEmail.get("anna@linguae.demo")._id));
  expect(lucia.friends.map(String)).not.toContain(String(kenji._id));
  expect(kenji.friends.map(String)).not.toContain(String(lucia._id));
  expect(
    await FriendRequest.findOne({ pairKey: pairKey(lucia._id, kenji._id) })
  ).toBeNull();

  expect(await FriendRequest.countDocuments({ recipient: maya._id, status: "pending" })).toBe(2);
  expect(await FriendRequest.countDocuments({ sender: maya._id, status: "accepted" })).toBe(2);
  expect(await FriendRequest.countDocuments({ sender: maya._id, status: "pending" })).toBe(1);

  const requests = await FriendRequest.find().lean();
  const keys = requests.map((row) => row.pairKey);
  expect(new Set(keys).size).toBe(keys.length);
  for (const row of requests) {
    expect(row.pairKey).toBe(pairKey(row.sender, row.recipient));
    const age = NOW.getTime() - new Date(row.createdAt).getTime();
    expect(age).toBeGreaterThanOrEqual(60 * 60 * 1000);
    expect(age).toBeLessThanOrEqual(6 * 24 * 60 * 60 * 1000);
  }

  const deleted = stream.deleteUsers.mock.calls[0];
  expect(deleted[0].map(String).sort()).toEqual(
    [String(oldA._id), String(oldB._id), "tagged-stream-user"].sort()
  );
  expect(deleted[1]).toEqual({ user: "hard", messages: "hard", conversations: "hard" });
  expect(stream.getTask).toHaveBeenCalledWith("task-1");

  const upserted = stream.upsertUsers.mock.calls[0][0];
  expect(upserted).toHaveLength(10);
  for (const user of upserted) {
    expect(user.seed).toBe("linguae-demo");
    expect(user.image).toBe(`https://api.dicebear.com/9.x/lorelei/svg?seed=${user.id}`);
  }
  expect(upserted.map((user) => user.id).sort()).toEqual(users.map((user) => String(user._id)).sort());

  const ops = stream.ops;
  const messageOps = ops.filter((op) => op.op === "message");
  expect(messageOps).toHaveLength(27);
  for (const op of messageOps) expect(op.options).toEqual({ skip_push: true });

  expect(ops.filter((op) => op.id === channelId(maya._id, lucia._id) && op.op === "message")).toHaveLength(8);
  expect(ops.filter((op) => op.id === channelId(maya._id, kenji._id) && op.op === "message")).toHaveLength(6);
  expect(ops.filter((op) => op.id === channelId(maya._id, byEmail.get("pierre@linguae.demo")._id) && op.op === "message")).toHaveLength(4);
  expect(ops.filter((op) => op.id === channelId(lucia._id, byEmail.get("anna@linguae.demo")._id) && op.op === "message")).toHaveLength(5);
  expect(ops.filter((op) => op.id === channelId(kenji._id, byEmail.get("hana@linguae.demo")._id) && op.op === "message")).toHaveLength(4);
  expect(ops.filter((op) => op.id === channelId(maya._id, byEmail.get("hana@linguae.demo")._id) && op.op === "message")).toHaveLength(0);
  expect(ops.filter((op) => op.id === channelId(maya._id, byEmail.get("hana@linguae.demo")._id) && op.op === "markRead")).toHaveLength(0);

  const reads = ops
    .filter((op) => op.op === "markRead")
    .map((op) => `${op.id}:${op.userId}`)
    .sort();
  const hana = byEmail.get("hana@linguae.demo");
  const pierre = byEmail.get("pierre@linguae.demo");
  const anna = byEmail.get("anna@linguae.demo");
  const expectedReads = [
    [channelId(maya._id, lucia._id), maya._id],
    [channelId(maya._id, lucia._id), lucia._id],
    [channelId(maya._id, kenji._id), maya._id],
    [channelId(maya._id, kenji._id), kenji._id],
    [channelId(maya._id, pierre._id), maya._id],
    [channelId(maya._id, pierre._id), pierre._id],
    [channelId(lucia._id, anna._id), lucia._id],
    [channelId(lucia._id, anna._id), anna._id],
    [channelId(kenji._id, hana._id), kenji._id],
    [channelId(kenji._id, hana._id), hana._id],
  ]
    .map(([id, userId]) => `${id}:${userId}`)
    .sort();
  expect(reads).toEqual(expectedReads);

  const luciaOps = ops.filter(
    (op) => op.id === channelId(maya._id, lucia._id) && (op.op === "message" || op.op === "markRead")
  );
  const mayaRead = luciaOps.filter((op) => op.op === "markRead" && op.userId === String(maya._id));
  expect(mayaRead).toHaveLength(1);
  const afterRead = luciaOps.slice(luciaOps.indexOf(mayaRead[0]) + 1).filter((op) => op.op === "message");
  expect(afterRead).toHaveLength(2);
  expect(afterRead.every((op) => op.message.user_id === String(lucia._id))).toBe(true);

  const firstIds = users.map((user) => String(user._id));
  await runSeed(seedArgs(stream, [], { apply: true, backupDir: args.backupDir }));
  expect(await User.countDocuments()).toBe(10);
  const remaining = (await User.find().select("_id")).map((user) => String(user._id));
  for (const id of firstIds) expect(remaining).not.toContain(id);
  const secondDeleted = stream.deleteUsers.mock.calls.at(-1)[0].map(String);
  for (const id of firstIds) expect(secondDeleted).toContain(id);
  expect(secondDeleted).toContain("tagged-stream-user");
  const beatAfter = await mongoose.connection.collection("system_heartbeat").findOne({ _id: "main" });
  expect(beatAfter.beats).toBe(4);

  const mayaLogin = request.agent(app);
  const loggedIn = await mayaLogin.post("/api/auth/login").send({
    email: "maya@linguae.demo",
    password: PASSWORD,
  });
  expect(loggedIn.status).toBe(200);
  expect(loggedIn.body.user.fullName).toBe("Maya Iyer");
  expect(loggedIn.body.user.password).toBeUndefined();

  const friends = await mayaLogin.get("/api/users/friends");
  expect(friends.status).toBe(200);
  expect(friends.body.map((user) => user.fullName).sort()).toEqual([
    "Hana Kim",
    "Kenji Mori",
    "Lucía Fernández",
    "Pierre Dubois",
  ]);

  const friendReqs = await mayaLogin.get("/api/users/friend-requests");
  expect(friendReqs.body.incomingReqs.map((row) => row.sender.fullName).sort()).toEqual([
    "Olga Petrova",
    "Sofia Almeida",
  ]);
  expect(friendReqs.body.acceptedReqs.map((row) => row.recipient.fullName).sort()).toEqual([
    "Hana Kim",
    "Pierre Dubois",
  ]);
  const outgoing = await mayaLogin.get("/api/users/outgoing-friend-requests");
  expect(outgoing.body).toHaveLength(1);

  const directory = await mayaLogin.get("/api/users?limit=50");
  expect(directory.status).toBe(200);
  expect(JSON.stringify(directory.body).includes('"email"')).toBe(false);
  expect(directory.body.users.map((user) => user.fullName).sort()).toEqual([
    "Anna Weber",
    "Layla Hassan",
    "Olga Petrova",
    "Sofia Almeida",
    "Wei Chen",
  ]);
  const friendIdSet = new Set(friends.body.map((user) => String(user._id)));
  for (const user of directory.body.users) expect(friendIdSet.has(String(user._id))).toBe(false);

  for (const email of LOGIN) {
    const response = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
    expect(response.status).toBe(200);
  }
  for (const email of OTHERS) {
    const response = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
    expect(response.status).toBe(401);
  }

  const luciaLogin = request.agent(app);
  expect(
    (await luciaLogin.post("/api/auth/login").send({ email: "lucia@linguae.demo", password: PASSWORD }))
      .status
  ).toBe(200);
  const luciaFriends = await luciaLogin.get("/api/users/friends");
  expect(luciaFriends.body.map((user) => user.fullName)).not.toContain("Kenji Mori");
  const luciaUsers = await luciaLogin.get("/api/users?limit=50");
  expect(JSON.stringify(luciaUsers.body).includes('"email"')).toBe(false);
  const luciaFriendIds = new Set(luciaFriends.body.map((user) => String(user._id)));
  for (const user of luciaUsers.body.users) expect(luciaFriendIds.has(String(user._id))).toBe(false);

  const kenjiLogin = request.agent(app);
  expect(
    (await kenjiLogin.post("/api/auth/login").send({ email: "kenji@linguae.demo", password: PASSWORD }))
      .status
  ).toBe(200);
  const kenjiFriends = await kenjiLogin.get("/api/users/friends");
  expect(kenjiFriends.body.map((user) => user.fullName)).not.toContain("Lucía Fernández");
  const kenjiUsers = await kenjiLogin.get("/api/users?limit=50");
  expect(JSON.stringify(kenjiUsers.body).includes('"email"')).toBe(false);
  const kenjiFriendIds = new Set(kenjiFriends.body.map((user) => String(user._id)));
  for (const user of kenjiUsers.body.users) expect(kenjiFriendIds.has(String(user._id))).toBe(false);
}, 120000);

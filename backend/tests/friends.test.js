import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import FriendRequest from "../src/models/FriendRequest.js";
import User from "../src/models/User.js";
import { has, looseLimits, profile, signupBody, startMongo, stopMongo, clearMongo } from "./helpers.js";

vi.mock("../src/lib/stream.js", () => ({
  upsertStreamUser: vi.fn(async (user) => user),
  generateStreamToken: vi.fn((userId) => `test-token-${userId}`),
}));

const ALREADY_EXISTS = "A friend request already exists between you and this user";
const ALREADY_SENT_YOU = "They already sent you a request. Check your Requests page.";
const SECRETS = ["email", "password", "friends", "isOnboarded"];

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

function leaks(value) {
  return Boolean(value) && typeof value === "object" && SECRETS.some((key) => has(value, key));
}

async function authed(fullName, native = "english", learning = "spanish", { onboard = true } = {}) {
  const agent = request.agent(app);
  const body = signupBody({ fullName });
  const signup = await agent.post("/api/auth/signup").send(body);
  expect(signup.status).toBe(201);
  if (onboard) {
    const done = await agent.post("/api/auth/onboarding").send({
      ...profile,
      fullName,
      nativeLanguage: native,
      learningLanguage: learning,
    });
    expect(done.status).toBe(200);
  }
  return { agent, id: signup.body.user._id };
}

async function insertUsers(rows) {
  const docs = rows.map((row, index) => ({
    fullName: row.fullName,
    email: row.email || `bulk-${index}-${Math.random().toString(16).slice(2)}@example.com`,
    password: "secret-hash",
    bio: row.bio ?? "",
    profilePic: "",
    nativeLanguage: row.nativeLanguage || "english",
    learningLanguage: row.learningLanguage || "spanish",
    location: row.location ?? "City",
    isOnboarded: row.isOnboarded !== false,
    friends: row.friends || [],
  }));
  const result = await User.collection.insertMany(docs);
  return docs.map((doc, index) => ({ ...doc, _id: result.insertedIds[index] }));
}

async function friendIds(userId) {
  const user = await User.findById(userId).select("friends").lean();
  return (user?.friends || []).map(String);
}

it("sends a request and rejects duplicates, self, people who are not onboarded, and existing friends", async () => {
  const me = await authed("Ada Lovelace");
  const other = await authed("Grace Hopper");
  const raw = await authed("Raw User", "english", "spanish", { onboard: false });
  const theirs = await authed("Their Friend");
  const mine = await authed("My Friend");

  const created = await me.agent.post(`/api/users/friend-request/${other.id}`);
  expect(created.status).toBe(201);
  expect(created.body.status).toBe("pending");
  expect(String(created.body.sender)).toBe(me.id);
  expect(String(created.body.recipient)).toBe(other.id);
  expect(created.body.pairKey).toBe([me.id, other.id].sort().join("_"));

  const outgoing = await me.agent.get("/api/users/outgoing-friend-requests");
  expect(outgoing.status).toBe(200);
  expect(outgoing.body[0]._id).toBe(created.body._id);
  expect(outgoing.body[0].recipient._id).toBe(other.id);
  expect(leaks(outgoing.body[0])).toBe(false);
  expect(leaks(outgoing.body[0].recipient)).toBe(false);

  const duplicate = await me.agent.post(`/api/users/friend-request/${other.id}`);
  expect(duplicate.status).toBe(400);
  expect(duplicate.body.message).toBe(ALREADY_EXISTS);
  expect(await FriendRequest.countDocuments({ sender: me.id, recipient: other.id })).toBe(1);

  const self = await me.agent.post(`/api/users/friend-request/${me.id}`);
  expect(self.status).toBe(400);
  expect(self.body.message).toBe("You can't send friend request to yourself");

  const closed = await me.agent.post(`/api/users/friend-request/${raw.id}`);
  expect(closed.status).toBe(400);
  expect(closed.body.message).toBe("Recipient is not onboarded");

  await User.updateOne({ _id: theirs.id }, { $addToSet: { friends: me.id } });
  const onTheirList = await me.agent.post(`/api/users/friend-request/${theirs.id}`);
  expect(onTheirList.status).toBe(400);
  expect(onTheirList.body.message).toBe("You are already friends with this user");

  await User.updateOne({ _id: me.id }, { $addToSet: { friends: mine.id } });
  const onMyList = await me.agent.post(`/api/users/friend-request/${mine.id}`);
  expect(onMyList.status).toBe(400);
  expect(onMyList.body.message).toBe("You are already friends with this user");
});

it("returns 409 when the other person already sent a pending request", async () => {
  const ada = await authed("Ada");
  const grace = await authed("Grace");
  const sent = await grace.agent.post(`/api/users/friend-request/${ada.id}`);
  expect(sent.status).toBe(201);

  const reverse = await ada.agent.post(`/api/users/friend-request/${grace.id}`);
  expect(reverse.status).toBe(409);
  expect(reverse.body.message).toBe(ALREADY_SENT_YOU);
  expect(await FriendRequest.countDocuments()).toBe(1);
});

it("keeps one request when two sends race", async () => {
  const ada = await authed("Ada Race");
  const grace = await authed("Grace Race");
  const [first, second] = await Promise.all([
    ada.agent.post(`/api/users/friend-request/${grace.id}`),
    ada.agent.post(`/api/users/friend-request/${grace.id}`),
  ]);
  const statuses = [first.status, second.status].sort();
  expect(statuses).toEqual([201, 400]);
  const failed = first.status === 400 ? first : second;
  expect(failed.body.message).toBe(ALREADY_EXISTS);
  expect(await FriendRequest.countDocuments()).toBe(1);
});

it("accepts only for the recipient, is idempotent, repairs a half-finished accept, and 404s when missing", async () => {
  const ada = await authed("Ada Accept");
  const grace = await authed("Grace Accept");
  const stranger = await authed("Stranger Accept");

  const created = await ada.agent.post(`/api/users/friend-request/${grace.id}`);
  expect(created.status).toBe(201);

  const forbidden = await stranger.agent.put(
    `/api/users/friend-request/${created.body._id}/accept`
  );
  expect(forbidden.status).toBe(403);
  expect(forbidden.body.message).toBe("You are not authorized to accept this request");
  expect((await FriendRequest.findById(created.body._id)).status).toBe("pending");

  const accepted = await grace.agent.put(`/api/users/friend-request/${created.body._id}/accept`);
  expect(accepted.status).toBe(200);
  expect(accepted.body).toEqual({ message: "Friend request accepted" });

  const again = await grace.agent.put(`/api/users/friend-request/${created.body._id}/accept`);
  expect(again.status).toBe(200);
  expect(await friendIds(ada.id)).toEqual([grace.id]);
  expect(await friendIds(grace.id)).toEqual([ada.id]);

  const missing = await grace.agent.put(
    `/api/users/friend-request/${new mongoose.Types.ObjectId()}/accept`
  );
  expect(missing.status).toBe(404);
  expect(missing.body.message).toBe("Friend request not found");

  const repair = await stranger.agent.post(`/api/users/friend-request/${grace.id}`);
  expect(repair.status).toBe(201);
  await FriendRequest.updateOne({ _id: repair.body._id }, { status: "accepted" });
  expect(await friendIds(stranger.id)).toEqual([]);

  const healed = await grace.agent.put(`/api/users/friend-request/${repair.body._id}/accept`);
  expect(healed.status).toBe(200);
  expect(await friendIds(stranger.id)).toEqual([grace.id]);
  expect(new Set(await friendIds(grace.id))).toEqual(new Set([ada.id, stranger.id]));
});

it("lets the recipient decline and the sender cancel, and hides every other delete", async () => {
  const ada = await authed("Ada Delete");
  const grace = await authed("Grace Delete");
  const stranger = await authed("Stranger Delete");

  const first = await ada.agent.post(`/api/users/friend-request/${grace.id}`);
  expect(first.status).toBe(201);
  const declined = await grace.agent.delete(`/api/users/friend-request/${first.body._id}`);
  expect(declined.status).toBe(200);
  expect(declined.body).toEqual({ message: "Friend request removed" });
  expect(await FriendRequest.countDocuments()).toBe(0);

  const resent = await ada.agent.post(`/api/users/friend-request/${grace.id}`);
  expect(resent.status).toBe(201);
  const cancelled = await ada.agent.delete(`/api/users/friend-request/${resent.body._id}`);
  expect(cancelled.status).toBe(200);
  expect(await FriendRequest.countDocuments()).toBe(0);

  const pending = await ada.agent.post(`/api/users/friend-request/${grace.id}`);
  const hidden = await stranger.agent.delete(`/api/users/friend-request/${pending.body._id}`);
  expect(hidden.status).toBe(404);
  expect(hidden.body).toEqual({ message: "Friend request not found" });
  expect(await FriendRequest.countDocuments({ _id: pending.body._id })).toBe(1);

  const accepted = await grace.agent.put(`/api/users/friend-request/${pending.body._id}/accept`);
  expect(accepted.status).toBe(200);
  const late = await ada.agent.delete(`/api/users/friend-request/${pending.body._id}`);
  expect(late.status).toBe(404);
  expect(late.body.message).toBe("Friend request not found");
  expect((await FriendRequest.findById(pending.body._id)).status).toBe("accepted");

  const bad = await ada.agent.delete("/api/users/friend-request/not-an-id");
  expect(bad.status).toBe(400);
  expect(bad.body.message).toBe("Invalid id");
});

it("returns capped lists with the existing shapes and no secret fields", async () => {
  const me = await authed("List Owner");
  const people = await insertUsers(
    Array.from({ length: 501 }, (_, index) => ({
      fullName: `F${String(index).padStart(4, "0")}`,
      location: `Place ${index}`,
    }))
  );
  await User.updateOne(
    { _id: me.id },
    { $set: { friends: people.map((person) => person._id) } }
  );

  const now = Date.now();
  await FriendRequest.collection.insertMany([
    ...people.slice(0, 51).map((person, index) => ({
      sender: person._id,
      recipient: new mongoose.Types.ObjectId(me.id),
      status: "pending",
      createdAt: new Date(now - index * 1000),
      updatedAt: new Date(now - index * 1000),
    })),
    ...people.slice(51, 62).map((person, index) => ({
      sender: new mongoose.Types.ObjectId(me.id),
      recipient: person._id,
      status: "accepted",
      createdAt: new Date(now - index * 1000),
      updatedAt: new Date(now - index * 1000),
    })),
    ...Array.from({ length: 201 }, (_, index) => ({
      sender: new mongoose.Types.ObjectId(me.id),
      recipient: people[70]._id,
      status: "pending",
      createdAt: new Date(now - index * 1000),
      updatedAt: new Date(now - index * 1000),
    })),
  ]);

  const friends = await me.agent.get("/api/users/friends");
  expect(friends.status).toBe(200);
  expect(friends.body).toHaveLength(500);
  expect(friends.body[0].fullName).toBe("F0000");
  expect(friends.body[499].fullName).toBe("F0499");
  expect(friends.body.some((friend) => friend.fullName === "F0500")).toBe(false);
  expect(friends.body.every((friend) => !leaks(friend) && friend.location)).toBe(true);

  const requests = await me.agent.get("/api/users/friend-requests");
  expect(requests.status).toBe(200);
  expect(Object.keys(requests.body).sort()).toEqual(["acceptedReqs", "incomingReqs"]);
  expect(requests.body.incomingReqs).toHaveLength(50);
  expect(requests.body.incomingReqs[0].sender._id).toBe(String(people[0]._id));
  expect(requests.body.incomingReqs[49].sender._id).toBe(String(people[49]._id));
  expect(requests.body.incomingReqs[0].sender.location).toBe("Place 0");
  expect(requests.body.incomingReqs.every((row) => !leaks(row) && !leaks(row.sender))).toBe(true);
  expect(requests.body.acceptedReqs).toHaveLength(10);
  expect(requests.body.acceptedReqs[0].recipient._id).toBe(String(people[51]._id));
  expect(requests.body.acceptedReqs[9].recipient._id).toBe(String(people[60]._id));
  expect(
    requests.body.acceptedReqs.every(
      (row) => !leaks(row) && !leaks(row.recipient) && !has(row.recipient, "location")
    )
  ).toBe(true);

  const outgoing = await me.agent.get("/api/users/outgoing-friend-requests");
  expect(outgoing.status).toBe(200);
  expect(outgoing.body).toHaveLength(200);
  expect(outgoing.body[0].recipient._id).toBe(String(people[70]._id));
  expect(outgoing.body.every((row) => row._id && !leaks(row) && !leaks(row.recipient))).toBe(true);
});

it("pages recommended users without gaps or duplicates", async () => {
  const me = await authed("Browser");
  const friend = await insertUsers([{ fullName: "Already Friend" }]);
  await insertUsers([{ fullName: "Not Ready", isOnboarded: false }]);
  const discoverable = await insertUsers(
    Array.from({ length: 5 }, (_, index) => ({ fullName: `Learner ${index}` }))
  );
  await User.updateOne({ _id: me.id }, { $set: { friends: [friend[0]._id] } });

  const expected = discoverable.map((user) => String(user._id)).sort((a, b) => (a < b ? 1 : -1));
  const seen = [];
  let cursor;
  let pages = 0;
  do {
    const response = await me.agent
      .get("/api/users")
      .query(cursor ? { limit: 2, cursor } : { limit: 2 });
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(5);
    expect(response.body.users.every((user) => !leaks(user))).toBe(true);
    seen.push(...response.body.users.map((user) => user._id));
    cursor = response.body.nextCursor;
    pages += 1;
  } while (cursor && pages < 6);

  expect(pages).toBe(3);
  expect(cursor).toBeNull();
  expect(seen).toEqual(expected);
  expect(seen).not.toContain(me.id);
  expect(seen).not.toContain(String(friend[0]._id));
});

it("matches a name literally, filters language, and rejects a bad language, cursor, or search", async () => {
  const me = await authed("Searcher");
  await insertUsers([
    { fullName: "Dot .* Star" },
    { fullName: "Paren (name" },
    { fullName: "Slash \\ name" },
    { fullName: "Plain Jane" },
    { fullName: "French Speaker", nativeLanguage: "french", learningLanguage: "english" },
  ]);

  const dot = await me.agent.get("/api/users").query({ q: ".*" });
  expect(dot.status).toBe(200);
  expect(dot.body.users.map((user) => user.fullName)).toEqual(["Dot .* Star"]);
  expect(dot.body.total).toBe(1);

  const paren = await me.agent.get("/api/users").query({ q: "(" });
  expect(paren.status).toBe(200);
  expect(paren.body.users.map((user) => user.fullName)).toEqual(["Paren (name"]);

  const slash = await me.agent.get("/api/users").query({ q: "\\" });
  expect(slash.status).toBe(200);
  expect(slash.body.users.map((user) => user.fullName)).toEqual(["Slash \\ name"]);

  const french = await me.agent.get("/api/users").query({ language: "french" });
  expect(french.status).toBe(200);
  expect(french.body.users.map((user) => user.fullName)).toEqual(["French Speaker"]);
  expect(french.body.total).toBe(1);

  const badLanguage = await me.agent.get("/api/users").query({ language: "klingon" });
  expect(badLanguage.status).toBe(400);

  const badCursor = await me.agent.get("/api/users").query({ cursor: "not-a-cursor" });
  expect(badCursor.status).toBe(400);

  const longSearch = await me.agent.get("/api/users").query({ q: "a".repeat(61) });
  expect(longSearch.status).toBe(400);
});

it("clamps the page size", async () => {
  const me = await authed("Pager");
  await insertUsers(Array.from({ length: 60 }, (_, index) => ({ fullName: `Page ${index}` })));

  const big = await me.agent.get("/api/users").query({ limit: 1000 });
  expect(big.status).toBe(200);
  expect(big.body.users).toHaveLength(50);
  expect(big.body.nextCursor).toBe(big.body.users.at(-1)._id);
  expect(big.body.total).toBe(60);

  const zero = await me.agent.get("/api/users").query({ limit: 0 });
  expect(zero.body.users).toHaveLength(1);
  expect(zero.body.total).toBe(60);

  const defaults = await me.agent.get("/api/users");
  expect(defaults.body.users).toHaveLength(12);
  expect(defaults.body.total).toBe(60);

  const second = await me.agent.get("/api/users").query({ limit: 50, cursor: big.body.nextCursor });
  expect(second.body.total).toBe(60);
  expect(second.body.users).toHaveLength(10);
  expect(second.body.nextCursor).toBeNull();
});

it("has the friend-request and user indexes", async () => {
  const friendIndexes = await FriendRequest.collection.indexes();
  const userIndexes = await User.collection.indexes();
  const pair = friendIndexes.find((index) => index.key?.pairKey === 1);
  expect(pair?.unique).toBe(true);
  expect(pair?.partialFilterExpression).toEqual({ pairKey: { $type: "string" } });

  expect(
    friendIndexes.some(
      (index) =>
        index.key?.recipient === 1 && index.key?.status === 1 && index.key?.createdAt === -1
    )
  ).toBe(true);
  expect(
    friendIndexes.some(
      (index) => index.key?.sender === 1 && index.key?.status === 1 && index.key?.updatedAt === -1
    )
  ).toBe(true);
  expect(
    userIndexes.some((index) => index.key?.isOnboarded === 1 && index.key?._id === -1)
  ).toBe(true);
  expect(
    userIndexes.some((index) => index.key?.nativeLanguage === 1 && index.key?._id === -1)
  ).toBe(true);
});

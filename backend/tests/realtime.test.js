import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import FriendRequest from "../src/models/FriendRequest.js";
import { notifyUser } from "../src/lib/stream.js";
import { looseLimits, profile, signupBody, startMongo, stopMongo, clearMongo } from "./helpers.js";

vi.mock("../src/lib/stream.js", () => ({
  upsertStreamUser: vi.fn(async (user) => user),
  generateStreamToken: vi.fn((userId) => `test-token-${userId}`),
  notifyUser: vi.fn(() => Promise.resolve()),
}));

const ALREADY_EXISTS = "A friend request already exists between you and this user";
const ALREADY_SENT_YOU = "They already sent you a request. Check your Requests page.";

let app;
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  app = createApp({ limits: looseLimits });
});

afterEach(async () => {
  await clearMongo();
  notifyUser.mockReset();
  notifyUser.mockImplementation(() => Promise.resolve());
});

afterAll(async () => {
  await stopMongo(mongo);
});

async function authed(fullName) {
  const agent = request.agent(app);
  const body = signupBody({ fullName });
  const signup = await agent.post("/api/auth/signup").send(body);
  expect(signup.status).toBe(201);
  const done = await agent.post("/api/auth/onboarding").send({
    ...profile,
    fullName,
  });
  expect(done.status).toBe(200);
  return { agent, id: signup.body.user._id };
}

function events() {
  return notifyUser.mock.calls.map((call) => ({ userId: call[0], event: call[1] }));
}

function expectEvent(userId, type, requestId, fromUserId) {
  const match = events().find(
    (item) => item.userId === String(userId) && item.event?.type === type
  );
  expect(match, `${type} to ${userId}`).toBeTruthy();
  expect(Object.keys(match.event).sort()).toEqual(["fromUserId", "requestId", "type"]);
  expect(match.event).toEqual({
    type,
    requestId: String(requestId),
    fromUserId: String(fromUserId),
  });
}

it("notifies the recipient when a request is created and nobody when it is rejected", async () => {
  const ada = await authed("Ada Send");
  const grace = await authed("Grace Send");
  const raw = request.agent(app);
  const rawSignup = await raw.post("/api/auth/signup").send(signupBody({ fullName: "Raw Send" }));
  expect(rawSignup.status).toBe(201);

  const created = await ada.agent.post(`/api/users/friend-request/${grace.id}`);
  expect(created.status).toBe(201);
  expect(events()).toHaveLength(1);
  expectEvent(grace.id, "friend_request_received", created.body._id, ada.id);

  notifyUser.mockClear();
  const duplicate = await ada.agent.post(`/api/users/friend-request/${grace.id}`);
  expect(duplicate.status).toBe(400);
  expect(duplicate.body.message).toBe(ALREADY_EXISTS);
  expect(notifyUser).not.toHaveBeenCalled();

  const self = await ada.agent.post(`/api/users/friend-request/${ada.id}`);
  expect(self.status).toBe(400);
  expect(notifyUser).not.toHaveBeenCalled();

  const invalid = await ada.agent.post("/api/users/friend-request/not-an-id");
  expect(invalid.status).toBe(400);
  expect(notifyUser).not.toHaveBeenCalled();

  const closed = await ada.agent.post(`/api/users/friend-request/${rawSignup.body.user._id}`);
  expect(closed.status).toBe(400);
  expect(notifyUser).not.toHaveBeenCalled();

  const reverse = await grace.agent.post(`/api/users/friend-request/${ada.id}`);
  expect(reverse.status).toBe(409);
  expect(reverse.body.message).toBe(ALREADY_SENT_YOU);
  expect(notifyUser).not.toHaveBeenCalled();
});

it("notifies the sender on accept and on a second accept, and stays quiet on 403 and 404", async () => {
  const ada = await authed("Ada Accept");
  const grace = await authed("Grace Accept");
  const stranger = await authed("Stranger Accept");

  const created = await ada.agent.post(`/api/users/friend-request/${grace.id}`);
  expect(created.status).toBe(201);
  notifyUser.mockClear();

  const forbidden = await stranger.agent.put(
    `/api/users/friend-request/${created.body._id}/accept`
  );
  expect(forbidden.status).toBe(403);
  expect(notifyUser).not.toHaveBeenCalled();

  const missing = await grace.agent.put(
    `/api/users/friend-request/${new mongoose.Types.ObjectId()}/accept`
  );
  expect(missing.status).toBe(404);
  expect(notifyUser).not.toHaveBeenCalled();

  const invalid = await grace.agent.put("/api/users/friend-request/not-an-id/accept");
  expect(invalid.status).toBe(400);
  expect(notifyUser).not.toHaveBeenCalled();

  const accepted = await grace.agent.put(`/api/users/friend-request/${created.body._id}/accept`);
  expect(accepted.status).toBe(200);
  expectEvent(ada.id, "friend_request_accepted", created.body._id, grace.id);

  const again = await grace.agent.put(`/api/users/friend-request/${created.body._id}/accept`);
  expect(again.status).toBe(200);
  const acceptedEvents = events().filter((item) => item.event.type === "friend_request_accepted");
  expect(acceptedEvents).toHaveLength(2);
  expect(acceptedEvents[1].userId).toBe(String(ada.id));
  expect(acceptedEvents[1].event).toEqual({
    type: "friend_request_accepted",
    requestId: String(created.body._id),
    fromUserId: String(grace.id),
  });

  notifyUser.mockClear();
  const repair = await stranger.agent.post(`/api/users/friend-request/${grace.id}`);
  expect(repair.status).toBe(201);
  notifyUser.mockClear();
  await FriendRequest.updateOne({ _id: repair.body._id }, { status: "accepted" });
  const healed = await grace.agent.put(`/api/users/friend-request/${repair.body._id}/accept`);
  expect(healed.status).toBe(200);
  expectEvent(stranger.id, "friend_request_accepted", repair.body._id, grace.id);
});

it("notifies the other person when a request is declined or cancelled", async () => {
  const ada = await authed("Ada Delete");
  const grace = await authed("Grace Delete");
  const stranger = await authed("Stranger Delete");

  const first = await ada.agent.post(`/api/users/friend-request/${grace.id}`);
  expect(first.status).toBe(201);
  notifyUser.mockClear();

  const hidden = await stranger.agent.delete(`/api/users/friend-request/${first.body._id}`);
  expect(hidden.status).toBe(404);
  expect(notifyUser).not.toHaveBeenCalled();

  const invalid = await grace.agent.delete("/api/users/friend-request/not-an-id");
  expect(invalid.status).toBe(400);
  expect(notifyUser).not.toHaveBeenCalled();

  const declined = await grace.agent.delete(`/api/users/friend-request/${first.body._id}`);
  expect(declined.status).toBe(200);
  expectEvent(ada.id, "friend_request_removed", first.body._id, grace.id);

  notifyUser.mockClear();
  const resent = await ada.agent.post(`/api/users/friend-request/${grace.id}`);
  expect(resent.status).toBe(201);
  notifyUser.mockClear();
  const cancelled = await ada.agent.delete(`/api/users/friend-request/${resent.body._id}`);
  expect(cancelled.status).toBe(200);
  expectEvent(grace.id, "friend_request_removed", resent.body._id, ada.id);
});

it("still returns the normal success when notifyUser throws or rejects", async () => {
  const ada = await authed("Ada Boom");
  const grace = await authed("Grace Boom");
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});

  notifyUser.mockImplementation(() => {
    throw new Error("boom");
  });
  const created = await ada.agent.post(`/api/users/friend-request/${grace.id}`);
  expect(created.status).toBe(201);
  expect(created.body.status).toBe("pending");
  expect(logged).toHaveBeenCalledWith("Error", "boom");
  expect(logged.mock.calls.every((args) => args.length === 2)).toBe(true);

  logged.mockClear();
  notifyUser.mockImplementation(() => Promise.reject(new Error("nope")));
  const accepted = await grace.agent.put(`/api/users/friend-request/${created.body._id}/accept`);
  expect(accepted.status).toBe(200);
  expect(accepted.body).toEqual({ message: "Friend request accepted" });
  await Promise.resolve();
  expect(logged).toHaveBeenCalledWith("Error", "nope");

  logged.mockClear();
  const resent = await ada.agent.post(`/api/users/friend-request/${grace.id}`);
  expect(resent.status).toBe(400);
  notifyUser.mockImplementation(() => Promise.reject(new Error("late")));
  const removed = await ada.agent.delete(`/api/users/friend-request/${created.body._id}`);
  expect(removed.status).toBe(404);
  await Promise.resolve();
  expect(logged).not.toHaveBeenCalled();

  logged.mockRestore();
});

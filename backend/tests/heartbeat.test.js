import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import Heartbeat from "../src/models/Heartbeat.js";
import { recordHeartbeat, startHeartbeat, stopHeartbeat } from "../src/lib/heartbeat.js";
import { clearMongo, startMongo, stopMongo } from "./helpers.js";

const FIVE_HOURS = 5 * 60 * 60 * 1000;
const SIX_HOURS = 6 * 60 * 60 * 1000;

let mongo;

beforeAll(async () => {
  mongo = await startMongo();
});

afterEach(async () => {
  stopHeartbeat();
  vi.useRealTimers();
  vi.restoreAllMocks();
  await clearMongo();
});

afterAll(async () => {
  await stopMongo(mongo);
});

async function beats() {
  const doc = await Heartbeat.findById("main").lean();
  return doc?.beats ?? 0;
}

async function waitForBeats(expected) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if ((await beats()) === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  expect(await beats()).toBe(expected);
}

it("upserts one heartbeat document and increments beats", async () => {
  await recordHeartbeat();
  await recordHeartbeat();
  const docs = await Heartbeat.find().lean();
  expect(docs).toHaveLength(1);
  expect(docs[0]._id).toBe("main");
  expect(docs[0].beats).toBe(2);
  expect(docs[0].lastBeatAt).toBeInstanceOf(Date);
  expect(mongoose.connection.collections.system_heartbeat).toBeTruthy();
});

it("records once at startup and respects the 5 hour rule", async () => {
  await startHeartbeat();
  expect(await Heartbeat.countDocuments()).toBe(1);
  expect(await beats()).toBe(1);
  stopHeartbeat();
  await clearMongo();

  await recordHeartbeat(new Date(Date.now() - FIVE_HOURS + 1000));
  expect(await beats()).toBe(1);
  await startHeartbeat();
  expect(await beats()).toBe(1);
  stopHeartbeat();
  await clearMongo();

  await recordHeartbeat(new Date(Date.now() - FIVE_HOURS - 1000));
  await startHeartbeat();
  expect(await beats()).toBe(2);
});

it("schedules the next beat with a timer", async () => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  await startHeartbeat();
  expect(await beats()).toBe(1);
  await vi.advanceTimersByTimeAsync(SIX_HOURS);
  await waitForBeats(2);
});

it("does not throw when the write fails", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(Heartbeat, "findByIdAndUpdate").mockRejectedValue(new Error("disk down"));
  await expect(startHeartbeat()).resolves.toBeUndefined();
  const text = logged.mock.calls.flat().join(" ");
  expect(text).toContain("Error");
  expect(text).toContain("disk down");
});

it("stopHeartbeat clears the timer", async () => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  await startHeartbeat();
  const afterStart = await beats();
  stopHeartbeat();
  await vi.advanceTimersByTimeAsync(SIX_HOURS);
  expect(await beats()).toBe(afterStart);
});

import { afterAll, beforeAll, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { signupBody, startMongo, stopMongo } from "./helpers.js";

vi.mock("../src/lib/stream.js", () => ({
  upsertStreamUser: vi.fn(async (user) => user),
  generateStreamToken: vi.fn((userId) => `test-token-${userId}`),
  notifyUser: vi.fn(() => Promise.resolve()),
}));

const TOO_MANY = "Too many requests, please try again later.";

let app;
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  app = createApp();
});

afterAll(async () => {
  await stopMongo(mongo);
});

it("blocks the 6th signup from the same IP", async () => {
  for (let index = 0; index < 5; index += 1) {
    const response = await request(app)
      .post("/api/auth/signup")
      .send(signupBody({ email: `rate-signup-${index}@example.com` }));
    expect(response.status).toBe(201);
  }

  const blocked = await request(app)
    .post("/api/auth/signup")
    .send(signupBody({ email: "rate-signup-blocked@example.com" }));
  expect(blocked.status).toBe(429);
  expect(blocked.body).toEqual({ message: TOO_MANY });
});

it("does not count successful logins and blocks the 11th failure", async () => {
  const loginApp = createApp();
  const body = signupBody({ email: "rate-login@example.com" });
  const signup = await request(loginApp).post("/api/auth/signup").send(body);
  expect(signup.status).toBe(201);

  const success = await request(loginApp).post("/api/auth/login").send({
    email: body.email,
    password: body.password,
  });
  expect(success.status).toBe(200);

  for (let index = 0; index < 10; index += 1) {
    const failure = await request(loginApp).post("/api/auth/login").send({
      email: body.email,
      password: "wrong-password",
    });
    expect(failure.status).toBe(401);
  }

  const blocked = await request(loginApp).post("/api/auth/login").send({
    email: body.email,
    password: "wrong-password",
  });
  expect(blocked.status).toBe(429);
  expect(blocked.body).toEqual({ message: TOO_MANY });
});

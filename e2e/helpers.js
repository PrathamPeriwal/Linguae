import { expect, request as playwrightRequest } from "@playwright/test";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertDevDatabase, loadEnvFile } from "./env-file.js";
import { BASE_URL } from "./runtime.js";

const backendEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../backend/.env");

function demoPassword() {
  const env = loadEnvFile(backendEnvPath);
  assertDevDatabase(env);
  return env.DEMO_PASSWORD;
}

export function channelId(left, right) {
  return [String(left), String(right)].sort().join("-");
}

async function fail(response, label) {
  if (response.ok()) return;
  let message = "";
  try {
    const body = await response.json();
    if (body && typeof body.message === "string") message = body.message.slice(0, 180);
  } catch {
    message = "";
  }
  throw new Error(`${label} failed (${response.status()}${message ? `: ${message}` : ""})`);
}

export async function login(context, email, password = demoPassword()) {
  const client = typeof context.post === "function" ? context : context.request;
  const response = await client.post("/api/auth/login", {
    data: { email, password },
  });
  await fail(response, `Login for ${email}`);
}

async function apiContext() {
  return playwrightRequest.newContext({ baseURL: BASE_URL });
}

export async function newUser({ onboard = true } = {}) {
  const env = loadEnvFile(backendEnvPath);
  assertDevDatabase(env);
  const hex = randomBytes(4).toString("hex");
  const letter = "abcdefghijklmnopqrstuvwxyz"[randomBytes(1)[0] % 26];
  const email = `e2e-${hex}-${letter}@example.com`;
  const password = `e2e-pass-${randomBytes(6).toString("hex")}`;
  const fullName = `E2E ${letter.toUpperCase()} ${hex}`;
  const api = await apiContext();
  try {
    const signup = await api.post("/api/auth/signup", {
      data: { email, password, fullName },
    });
    await fail(signup, "Signup");
    const created = await signup.json();
    const id = created?.user?._id;
    if (!id) throw new Error("Signup did not return a user id");
    if (onboard) {
      const profile = await api.post("/api/auth/onboarding", {
        data: {
          fullName,
          bio: "Learning with the end-to-end suite.",
          nativeLanguage: "english",
          learningLanguage: "spanish",
          location: "Test City",
        },
      });
      await fail(profile, "Onboarding");
    }
    return { email, password, fullName, id };
  } finally {
    await api.dispose();
  }
}

export async function makeFriends(left, right) {
  const a = await apiContext();
  const b = await apiContext();
  try {
    await login(a, left.email, left.password);
    await login(b, right.email, right.password);
    const sent = await a.post(`/api/users/friend-request/${right.id}`);
    await fail(sent, "Send friend request");
    const doc = await sent.json();
    const accepted = await b.put(`/api/users/friend-request/${doc._id}/accept`);
    await fail(accepted, "Accept friend request");
  } finally {
    await a.dispose();
    await b.dispose();
  }
}

export async function watchPage(page) {
  const problems = [];
  const seen = new Set();
  const expected = [(status, url) => status === 401 && url.includes("/api/auth/me")];

  const push = (kind, text) => {
    const line = `${kind}: ${text}`;
    if (seen.has(line)) return;
    seen.add(line);
    problems.push({ kind, text });
  };

  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      console.error(
        `Content Security Policy violation: ${event.violatedDirective} blocked ${event.blockedURI}`
      );
    });
  });

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/^Failed to load resource:/i.test(text)) return;
    if (/Content Security Policy|Report Only|securitypolicyviolation/i.test(text)) {
      push("csp", text);
      return;
    }
    push("console", text);
  });

  page.on("pageerror", (error) => {
    push("pageerror", error.message);
  });

  page.on("response", (response) => {
    const status = response.status();
    if (status < 400) return;
    const url = response.url();
    if (expected.some((check) => check(status, url))) return;
    push("http", `${status} ${url}`);
  });

  return {
    allow(status, urlPart) {
      expected.push((code, url) => code === status && url.includes(urlPart));
    },
    assertClean() {
      if (problems.length === 0) return;
      const csp = problems.filter((item) => item.kind === "csp");
      const rest = problems.filter((item) => item.kind !== "csp");
      const lines = [];
      if (csp.length) {
        lines.push(`CSP violation${csp.length === 1 ? "" : "s"}:\n${csp.map((item) => item.text).join("\n")}`);
      }
      if (rest.length) {
        lines.push(
          `Unexpected page error${rest.length === 1 ? "" : "s"}:\n${rest
            .map((item) => `${item.kind}: ${item.text}`)
            .join("\n")}`
        );
      }
      throw new Error(lines.join("\n\n"));
    },
  };
}

export async function openContext(browser, options = {}) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    permissions: ["camera", "microphone"],
    ...options,
  });
  const page = await context.newPage();
  const guard = await watchPage(page);
  return { context, page, guard };
}

export async function loginThroughUi(page, email, password = demoPassword()) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Meet new learners" })).toBeVisible();
}

export async function liveVideoTracks(page) {
  return page.evaluate(() => {
    const live = [];
    for (const element of document.querySelectorAll("video, audio")) {
      const stream = element.srcObject;
      if (!stream || typeof stream.getVideoTracks !== "function") continue;
      for (const track of stream.getVideoTracks()) {
        if (track.readyState === "live") live.push(track.kind);
      }
    }
    return live;
  });
}

import { randomBytes } from "node:crypto";
import { StreamChat } from "stream-chat";
import { env } from "../src/config/env.js";

const base = (process.argv[2] || "http://localhost:5001").replace(/\/$/, "");
const password = "verify-password-1";
const profilePic = "https://api.dicebear.com/9.x/lorelei/svg?seed=b4";
const clients = [];
let failed = 0;

function safe(value) {
  const text = value instanceof Error ? `${value.name}: ${value.message}` : String(value ?? "");
  const secret = env.STREAM_API_KEY;
  return secret ? text.split(secret).join("[redacted]") : text;
}

function check(name, ok, detail) {
  const extra = !ok && detail ? `: ${safe(detail)}` : "";
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra}`);
  if (!ok) failed += 1;
}

function setCookieLines(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

function cookieHeader(lines) {
  return lines
    .map((line) => line.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

async function request(path, { method = "GET", cookie, body } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  return { status: response.status, data, cookies: setCookieLines(response) };
}

function failure(response) {
  const message =
    response.data && typeof response.data.message === "string" ? response.data.message : "";
  return `status ${response.status}${message ? ` ${message}` : ""}`;
}

function listen(client, type) {
  let timer;
  let handler;
  const promise = new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      client.off(type, handler);
      reject(new Error(`timed out after 5s waiting for ${type}`));
    }, 5000);
    handler = (event) => {
      clearTimeout(timer);
      client.off(type, handler);
      resolve(event);
    };
    client.on(type, handler);
  });
  promise.catch(() => {});
  return {
    promise,
    stop() {
      clearTimeout(timer);
      client.off(type, handler);
    },
  };
}

function eventIds(event) {
  return `requestId=${event?.requestId ?? ""} fromUserId=${event?.fromUserId ?? ""}`;
}

async function expectEvent(pending, { type, requestId, fromUserId }) {
  const event = await pending.promise;
  const ok =
    event?.type === type &&
    String(event.requestId) === String(requestId) &&
    String(event.fromUserId) === String(fromUserId);
  check(type, ok, ok ? "" : eventIds(event));
  return ok;
}

async function createUser(email, fullName, nativeLanguage, learningLanguage) {
  const signup = await request("/api/auth/signup", {
    method: "POST",
    body: { email, password, fullName },
  });
  if (signup.status !== 201 || !signup.data?.user?._id) {
    throw new Error(`signup failed ${failure(signup)}`);
  }
  const cookie = cookieHeader(signup.cookies);
  const onboard = await request("/api/auth/onboarding", {
    method: "POST",
    cookie,
    body: {
      fullName,
      bio: "Realtime check.",
      nativeLanguage,
      learningLanguage,
      location: "Test City",
      profilePic,
    },
  });
  if (onboard.status !== 200) throw new Error(`onboarding failed ${failure(onboard)}`);
  const token = await request("/api/chat/token", { cookie });
  if (token.status !== 200 || typeof token.data?.token !== "string" || token.data.token.length === 0) {
    throw new Error(`chat token failed ${failure(token)}`);
  }
  return { id: String(signup.data.user._id), cookie, token: token.data.token, name: fullName };
}

function openClient(factory) {
  const client = factory();
  clients.push(client);
  return client;
}

async function connect(client, user) {
  await client.connectUser({ id: user.id, name: user.name }, user.token);
  return client;
}

async function disconnect(client) {
  try {
    if (client?.userID) await client.disconnectUser();
  } catch (error) {
    console.error(safe(error));
  }
}

async function main() {
  const stamp = randomBytes(4).toString("hex");
  const options = { allowServerSideConnect: true, timeout: 10000 };
  const ada = await createUser(
    `b4-check-${stamp}-a@example.com`,
    "Ada B4",
    "english",
    "spanish"
  );
  const bea = await createUser(
    `b4-check-${stamp}-b@example.com`,
    "Bea B4",
    "spanish",
    "french"
  );
  const cleo = await createUser(
    `b4-check-${stamp}-c@example.com`,
    "Cleo B4",
    "french",
    "english"
  );

  const recipient = openClient(() => StreamChat.getInstance(env.STREAM_API_KEY, options));
  const sender = openClient(() => new StreamChat(env.STREAM_API_KEY, options));
  const third = openClient(() => new StreamChat(env.STREAM_API_KEY, options));
  await connect(recipient, bea);
  await connect(sender, ada);
  await connect(third, cleo);

  const received = listen(recipient, "friend_request_received");
  const sent = await request(`/api/users/friend-request/${bea.id}`, {
    method: "POST",
    cookie: ada.cookie,
  });
  check("sender created the request", sent.status === 201, failure(sent));
  if (sent.status !== 201) {
    received.stop();
    return;
  }
  const gotReceived = await expectEvent(received, {
    type: "friend_request_received",
    requestId: sent.data._id,
    fromUserId: ada.id,
  });
  if (!gotReceived) return;

  const accepted = listen(sender, "friend_request_accepted");
  const accept = await request(`/api/users/friend-request/${sent.data._id}/accept`, {
    method: "PUT",
    cookie: bea.cookie,
  });
  check("recipient accepted the request", accept.status === 200, failure(accept));
  if (accept.status !== 200) {
    accepted.stop();
    return;
  }
  await expectEvent(accepted, {
    type: "friend_request_accepted",
    requestId: sent.data._id,
    fromUserId: bea.id,
  });

  const declinedWait = listen(third, "friend_request_removed");
  const toBea = await request(`/api/users/friend-request/${bea.id}`, {
    method: "POST",
    cookie: cleo.cookie,
  });
  check("second request was created for decline", toBea.status === 201, failure(toBea));
  if (toBea.status !== 201) {
    declinedWait.stop();
    return;
  }
  const declined = await request(`/api/users/friend-request/${toBea.data._id}`, {
    method: "DELETE",
    cookie: bea.cookie,
  });
  check("recipient declined the request", declined.status === 200, failure(declined));
  if (declined.status !== 200) {
    declinedWait.stop();
    return;
  }
  await expectEvent(declinedWait, {
    type: "friend_request_removed",
    requestId: toBea.data._id,
    fromUserId: bea.id,
  });

  const cancelledWait = listen(sender, "friend_request_removed");
  const toAda = await request(`/api/users/friend-request/${ada.id}`, {
    method: "POST",
    cookie: cleo.cookie,
  });
  check("second request was created for cancel", toAda.status === 201, failure(toAda));
  if (toAda.status !== 201) {
    cancelledWait.stop();
    return;
  }
  const cancelled = await request(`/api/users/friend-request/${toAda.data._id}`, {
    method: "DELETE",
    cookie: cleo.cookie,
  });
  check("sender cancelled the request", cancelled.status === 200, failure(cancelled));
  if (cancelled.status !== 200) {
    cancelledWait.stop();
    return;
  }
  await expectEvent(cancelledWait, {
    type: "friend_request_removed",
    requestId: toAda.data._id,
    fromUserId: cleo.id,
  });
}

try {
  await main();
} catch (error) {
  check("realtime check", false, safe(error));
} finally {
  await Promise.all(clients.map(disconnect));
}

process.exit(failed === 0 ? 0 : 1);

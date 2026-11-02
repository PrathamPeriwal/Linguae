import { StreamChat } from "stream-chat";
import { env } from "../src/config/env.js";

const base = (process.argv[2] || "http://localhost:5001").replace(/\/$/, "");
const password = process.env.DEMO_PASSWORD;
const clients = [];
let failed = 0;

function safe(value) {
  let text = value instanceof Error ? `${value.name}: ${value.message}` : String(value ?? "");
  for (const secret of [env.STREAM_API_KEY, env.STREAM_API_SECRET, password]) {
    if (typeof secret === "string" && secret.length > 0) text = text.split(secret).join("[redacted]");
  }
  return text.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[redacted]");
}

function check(name, ok, detail) {
  const extra = !ok && detail ? `: ${safe(detail)}` : "";
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra}`);
  if (!ok) failed += 1;
}

function setCookieLines(response) {
  if (typeof response.headers.getSetCookie === "function") return response.headers.getSetCookie();
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

function names(list, pick) {
  return (Array.isArray(list) ? list : []).map(pick).sort();
}

function same(actual, expected) {
  return actual.length === expected.length && actual.every((item, index) => item === expected[index]);
}

function channelId(a, b) {
  return [String(a), String(b)].sort().join("-");
}

function hasEmail(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasEmail);
  if (Object.prototype.hasOwnProperty.call(value, "email")) return true;
  return Object.values(value).some(hasEmail);
}

async function login(email) {
  const response = await request("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return {
    ok: response.status === 200 && response.data?.user?._id,
    id: response.data?.user?._id ? String(response.data.user._id) : "",
    name: response.data?.user?.fullName || "",
    cookie: cookieHeader(response.cookies),
    detail: failure(response),
  };
}

async function allUsers(cookie) {
  const rows = [];
  let cursor = "";
  for (let page = 0; page < 10; page += 1) {
    const path = cursor
      ? `/api/users?limit=50&cursor=${encodeURIComponent(cursor)}`
      : "/api/users?limit=50";
    const response = await request(path, { cookie });
    if (response.status !== 200) throw new Error(failure(response));
    if (hasEmail(response.data)) throw new Error("response contains an email field");
    rows.push(...(response.data.users || []));
    if (!response.data.nextCursor) return rows;
    cursor = response.data.nextCursor;
  }
  return rows;
}

function messageCount(channel) {
  const messages = channel?.state?.messages;
  return Array.isArray(messages) ? messages.length : 0;
}

function unreadCount(channel) {
  const value = channel?.state?.unreadCount;
  if (typeof value === "number") return value;
  if (typeof channel?.countUnread === "function") return channel.countUnread();
  return -1;
}

async function disconnect(client) {
  try {
    if (client?.userID) await client.disconnectUser();
  } catch (error) {
    console.error(safe(error));
  }
}

async function main() {
  if (typeof password !== "string" || password.length < 8) {
    check("DEMO_PASSWORD is set", false, "missing or shorter than 8 characters");
    return;
  }

  const maya = await login("maya@linguae.demo");
  const lucia = await login("lucia@linguae.demo");
  const kenji = await login("kenji@linguae.demo");
  check("Maya logs in", maya.ok, maya.detail);
  check("Lucía logs in", lucia.ok, lucia.detail);
  check("Kenji logs in", kenji.ok, kenji.detail);
  if (!maya.ok || !lucia.ok || !kenji.ok) return;

  const mayaFriends = await request("/api/users/friends", { cookie: maya.cookie });
  const luciaFriends = await request("/api/users/friends", { cookie: lucia.cookie });
  const kenjiFriends = await request("/api/users/friends", { cookie: kenji.cookie });
  check("friends requests succeeded", mayaFriends.status === 200 && luciaFriends.status === 200 && kenjiFriends.status === 200);
  check(
    "Maya friends",
    same(names(mayaFriends.data, (user) => user.fullName), [
      "Hana Kim",
      "Kenji Mori",
      "Lucía Fernández",
      "Pierre Dubois",
    ])
  );
  check(
    "Lucía friends",
    same(names(luciaFriends.data, (user) => user.fullName), ["Anna Weber", "Maya Iyer"])
  );
  check(
    "Kenji friends",
    same(names(kenjiFriends.data, (user) => user.fullName), ["Hana Kim", "Maya Iyer"])
  );
  check(
    "Lucía and Kenji are not friends",
    !names(luciaFriends.data, (user) => user.fullName).includes("Kenji Mori") &&
      !names(kenjiFriends.data, (user) => user.fullName).includes("Lucía Fernández")
  );

  const mayaReqs = await request("/api/users/friend-requests", { cookie: maya.cookie });
  const luciaReqs = await request("/api/users/friend-requests", { cookie: lucia.cookie });
  const kenjiReqs = await request("/api/users/friend-requests", { cookie: kenji.cookie });
  const mayaOut = await request("/api/users/outgoing-friend-requests", { cookie: maya.cookie });
  check(
    "Maya incoming requests",
    same(names(mayaReqs.data?.incomingReqs, (row) => row.sender?.fullName), [
      "Olga Petrova",
      "Sofia Almeida",
    ])
  );
  check(
    "Maya accepted requests",
    same(names(mayaReqs.data?.acceptedReqs, (row) => row.recipient?.fullName), [
      "Hana Kim",
      "Pierre Dubois",
    ])
  );
  check("Maya pending outgoing", Array.isArray(mayaOut.data) && mayaOut.data.length === 1);
  check(
    "Lucía incoming request",
    same(names(luciaReqs.data?.incomingReqs, (row) => row.sender?.fullName), ["Wei Chen"])
  );
  check(
    "Kenji incoming request",
    same(names(kenjiReqs.data?.incomingReqs, (row) => row.sender?.fullName), ["Layla Hassan"])
  );

  for (const person of [
    ["Maya", maya, mayaFriends.data],
    ["Lucía", lucia, luciaFriends.data],
    ["Kenji", kenji, kenjiFriends.data],
  ]) {
    const [label, user, friends] = person;
    let rows = [];
    let directoryError = "";
    try {
      rows = await allUsers(user.cookie);
    } catch (error) {
      directoryError = safe(error);
    }
    const friendIds = new Set((friends || []).map((friend) => String(friend._id)));
    const leaked = rows.some((row) => friendIds.has(String(row._id)));
    check(`${label} directory hides friends and email`, !directoryError && !leaked, directoryError);
  }

  const mayaDirectory = await allUsers(maya.cookie);
  check(
    "Maya discover names",
    same(names(mayaDirectory, (user) => user.fullName), [
      "Anna Weber",
      "Layla Hassan",
      "Olga Petrova",
      "Sofia Almeida",
      "Wei Chen",
    ])
  );

  const token = await request("/api/chat/token", { cookie: maya.cookie });
  const tokenOk = token.status === 200 && typeof token.data?.token === "string" && token.data.token.length > 0;
  check("Maya chat token", tokenOk, failure(token));
  if (!tokenOk) return;

  const idOf = (list, fullName) => {
    const found = (list || []).find((user) => user.fullName === fullName);
    return found?._id ? String(found._id) : "";
  };
  const luciaId = idOf(mayaFriends.data, "Lucía Fernández");
  const kenjiId = idOf(mayaFriends.data, "Kenji Mori");
  const pierreId = idOf(mayaFriends.data, "Pierre Dubois");
  const hanaId = idOf(mayaFriends.data, "Hana Kim");

  const client = new StreamChat(env.STREAM_API_KEY, { allowServerSideConnect: true, timeout: 15000 });
  clients.push(client);
  await client.connectUser({ id: maya.id, name: maya.name }, token.data.token);
  const channels = await client.queryChannels(
    { type: "messaging", members: { $in: [maya.id] } },
    { last_message_at: -1 },
    { watch: true, state: true, limit: 30 }
  );
  const withMessages = channels.filter((channel) => messageCount(channel) > 0);
  check("Maya has 3 channels with messages", withMessages.length === 3, `got ${withMessages.length}`);

  const findChannel = (otherId) => channels.find((channel) => channel.id === channelId(maya.id, otherId));
  const luciaChannel = findChannel(luciaId);
  const kenjiChannel = findChannel(kenjiId);
  const pierreChannel = findChannel(pierreId);
  check("Lucía channel unread is 2", Boolean(luciaChannel) && unreadCount(luciaChannel) === 2, `got ${luciaChannel ? unreadCount(luciaChannel) : "missing"}`);
  check("Kenji channel unread is 0", Boolean(kenjiChannel) && unreadCount(kenjiChannel) === 0, `got ${kenjiChannel ? unreadCount(kenjiChannel) : "missing"}`);
  check("Pierre channel unread is 0", Boolean(pierreChannel) && unreadCount(pierreChannel) === 0, `got ${pierreChannel ? unreadCount(pierreChannel) : "missing"}`);

  let hanaChannel = findChannel(hanaId);
  if (!hanaChannel) {
    hanaChannel = client.channel("messaging", channelId(maya.id, hanaId));
    await hanaChannel.query({ state: true, watch: false, messages: { limit: 10 } });
  }
  check("Hana channel has no messages", messageCount(hanaChannel) === 0, `got ${messageCount(hanaChannel)}`);
}

try {
  await main();
} catch (error) {
  check("demo check", false, safe(error));
} finally {
  await Promise.all(clients.map(disconnect));
}

process.exit(failed === 0 ? 0 : 1);

const base = (process.argv[2] || "http://localhost:5001").replace(/\/$/, "");
const email = `verify-${Date.now()}@example.com`;
const password = "verify-password-1";
const profilePic = "https://api.dicebear.com/9.x/lorelei/svg?seed=verify";

let failed = 0;

function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${!ok && detail ? `: ${detail}` : ""}`);
  if (!ok) failed += 1;
}

function has(object, key) {
  return (
    Boolean(object) &&
    typeof object === "object" &&
    Object.prototype.hasOwnProperty.call(object, key)
  );
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

function jwtCleared(lines) {
  const line = lines.find((item) => /^\s*jwt=/i.test(item));
  if (!line) return false;
  const pair = line.split(";")[0];
  const value = pair.slice(pair.indexOf("=") + 1).trim();
  if (value !== "") return false;
  const expires = /expires=([^;]+)/i.exec(line);
  if (expires) {
    const when = new Date(expires[1].trim());
    if (!Number.isNaN(when.getTime()) && when.getTime() <= Date.now()) return true;
  }
  const maxAge = /max-age=(-?\d+)/i.exec(line);
  return Boolean(maxAge && Number(maxAge[1]) <= 0);
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

function usersLeak(body) {
  if (!Array.isArray(body)) return true;
  return body.some(
    (user) =>
      user &&
      typeof user === "object" &&
      ["email", "password", "friends", "isOnboarded"].some((key) => has(user, key))
  );
}

const onboardFields = {
  fullName: "Verify Person",
  bio: "A short bio for the security check.",
  nativeLanguage: "english",
  learningLanguage: "spanish",
  location: "Test City",
  profilePic,
};

async function main() {
  const badLogin = await request("/api/auth/login", {
    method: "POST",
    body: { email: { $ne: null }, password: "whatever" },
  });
  check(
    "login with a { $ne: null } email returns 400",
    badLogin.status === 400,
    `status ${badLogin.status}`
  );

  const signup = await request("/api/auth/signup", {
    method: "POST",
    body: { fullName: "Verify User", email, password },
  });
  const signedUp = signup.data?.user;
  check(
    "signup returns no password",
    signup.status === 201 && signedUp && !has(signedUp, "password"),
    `status ${signup.status}`
  );

  let session = cookieHeader(signup.cookies);
  const me = await request("/api/auth/me", { cookie: session });
  const meUser = me.data?.user;
  check(
    "GET /api/auth/me has no password and no __v",
    me.status === 200 && meUser && !has(meUser, "password") && !has(meUser, "__v"),
    `status ${me.status}`
  );

  const users = await request("/api/users", { cookie: session });
  check(
    "GET /api/users returns no email, password, friends, or isOnboarded",
    users.status === 200 && !usersLeak(users.data),
    `status ${users.status}`
  );

  const sameLanguage = await request("/api/auth/onboarding", {
    method: "POST",
    cookie: session,
    body: {
      ...onboardFields,
      nativeLanguage: "english",
      learningLanguage: "english",
    },
  });
  check(
    "onboarding with a same-language pair returns 400",
    sameLanguage.status === 400 &&
      sameLanguage.data?.message === "Choose a different language to learn.",
    `status ${sameLanguage.status}`
  );

  const extra = await request("/api/auth/onboarding", {
    method: "POST",
    cookie: session,
    body: {
      ...onboardFields,
      friends: ["000000000000000000000000"],
      email: "hacked@example.com",
      password: "hacked-password",
      isOnboarded: false,
      $set: { email: "hacked@example.com" },
    },
  });
  const after = await request("/api/auth/me", { cookie: session });
  const afterUser = after.data?.user;
  const friends = await request("/api/users/friends", { cookie: session });
  const stillLogsIn = await request("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (stillLogsIn.cookies.length > 0) session = cookieHeader(stillLogsIn.cookies);
  const ignored =
    extra.status === 200 &&
    after.status === 200 &&
    afterUser &&
    afterUser.email === email &&
    afterUser.isOnboarded === true &&
    afterUser.fullName === onboardFields.fullName &&
    afterUser.bio === onboardFields.bio &&
    afterUser.nativeLanguage === "english" &&
    afterUser.learningLanguage === "spanish" &&
    afterUser.location === onboardFields.location &&
    afterUser.profilePic === profilePic &&
    !has(afterUser, "password") &&
    !has(afterUser, "friends") &&
    !has(afterUser, "__v") &&
    Array.isArray(friends.data) &&
    friends.data.length === 0 &&
    stillLogsIn.status === 200 &&
    !has(stillLogsIn.data?.user, "password");
  check(
    "onboarding ignores extra fields",
    ignored,
    `onboard ${extra.status}, me ${after.status}, login ${stillLogsIn.status}`
  );

  const badId = await request("/api/users/friend-request/not-an-id", {
    method: "POST",
    cookie: session,
  });
  check(
    "invalid friend-request id returns 400",
    badId.status === 400 && badId.data?.message === "Invalid id",
    `status ${badId.status}`
  );

  const logout = await request("/api/auth/logout", {
    method: "POST",
    cookie: session,
  });
  check(
    "logout expires the jwt cookie",
    logout.status === 200 && jwtCleared(logout.cookies),
    `status ${logout.status}`
  );

  const loggedOut = await request("/api/auth/me", {
    cookie: logout.cookies.length > 0 ? cookieHeader(logout.cookies) : session,
  });
  check(
    "logged-out GET /api/auth/me returns 401",
    loggedOut.status === 401,
    `status ${loggedOut.status}`
  );

  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.log(`FAIL request: ${error.message}`);
  process.exit(1);
});

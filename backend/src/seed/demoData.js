import { randomBytes } from "node:crypto";
import { chmod, mkdir, open, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { onboardSchema } from "../controllers/auth.controller.js";
import { getDbName, sanitiseDbMessage } from "../lib/db.js";

const SEED_TAG = "linguae-demo";
// stream-chat 8.60.0 DeleteUserOptions: user and messages are "soft" | "hard" | "pruning";
// conversations is "soft" | "hard". The types do not declare a batch size.
// The delete-users API accepts at most 100 ids per call.
const DELETE_USER_BATCH = 100;
const HARD_DELETE = { user: "hard", messages: "hard", conversations: "hard" };
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const defaultBackupDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../backups"
);

const PEOPLE = [
  {
    key: "maya",
    fullName: "Maya Iyer",
    email: "maya@linguae.demo",
    login: true,
    nativeLanguage: "hindi",
    learningLanguage: "spanish",
    location: "Bengaluru, India",
    bio: "learning Spanish for a trip to Madrid, happy to chat in Hindi or English.",
  },
  {
    key: "lucia",
    fullName: "Lucía Fernández",
    email: "lucia@linguae.demo",
    login: true,
    nativeLanguage: "spanish",
    learningLanguage: "english",
    location: "Madrid, Spain",
    bio: "a primary school teacher who wants to sound natural in English and is patient with learners.",
  },
  {
    key: "kenji",
    fullName: "Kenji Mori",
    email: "kenji@linguae.demo",
    login: true,
    nativeLanguage: "japanese",
    learningLanguage: "english",
    location: "Osaka, Japan",
    bio: "an engineer who loves films, wants to practise English and help with Japanese.",
  },
  {
    key: "anna",
    fullName: "Anna Weber",
    email: "anna@linguae.demo",
    nativeLanguage: "german",
    learningLanguage: "english",
    location: "Berlin",
    bio: "I live in Berlin and I am learning English. I like calm conversations about everyday life.",
  },
  {
    key: "pierre",
    fullName: "Pierre Dubois",
    email: "pierre@linguae.demo",
    nativeLanguage: "french",
    learningLanguage: "spanish",
    location: "Lyon",
    bio: "I am in Lyon and I am learning Spanish. I am happy to chat slowly and share simple French.",
  },
  {
    key: "sofia",
    fullName: "Sofia Almeida",
    email: "sofia@linguae.demo",
    nativeLanguage: "portuguese",
    learningLanguage: "english",
    location: "Lisbon",
    bio: "I am from Lisbon and I want to feel more comfortable speaking English. I like cooking and walking.",
  },
  {
    key: "olga",
    fullName: "Olga Petrova",
    email: "olga@linguae.demo",
    nativeLanguage: "russian",
    learningLanguage: "english",
    location: "Moscow",
    bio: "I live in Moscow and I am practising English. I am glad to help with simple Russian phrases.",
  },
  {
    key: "hana",
    fullName: "Hana Kim",
    email: "hana@linguae.demo",
    nativeLanguage: "korean",
    learningLanguage: "english",
    location: "Seoul",
    bio: "I am in Seoul and I am learning English. I like music and I am happy to go at an easy pace.",
  },
  {
    key: "wei",
    fullName: "Wei Chen",
    email: "wei@linguae.demo",
    nativeLanguage: "mandarin",
    learningLanguage: "english",
    location: "Shanghai",
    bio: "I live in Shanghai and I want to practise everyday English. I can help with simple Mandarin.",
  },
  {
    key: "layla",
    fullName: "Layla Hassan",
    email: "layla@linguae.demo",
    nativeLanguage: "arabic",
    learningLanguage: "english",
    location: "Cairo",
    bio: "I am in Cairo and I am learning English. I like films and calm conversations.",
  },
];

// hoursAgo is between 1 hour and 6 days. Accepted rows get a slightly later updatedAt.
const REQUESTS = [
  { from: "lucia", to: "maya", status: "accepted", hoursAgo: 6 * 24 },
  { from: "kenji", to: "maya", status: "accepted", hoursAgo: 5 * 24 },
  { from: "maya", to: "pierre", status: "accepted", hoursAgo: 4 * 24 },
  { from: "maya", to: "hana", status: "accepted", hoursAgo: 3 * 24 },
  { from: "lucia", to: "anna", status: "accepted", hoursAgo: 2 * 24 },
  { from: "kenji", to: "hana", status: "accepted", hoursAgo: 36 },
  { from: "sofia", to: "maya", status: "pending", hoursAgo: 20 },
  { from: "olga", to: "maya", status: "pending", hoursAgo: 10 },
  { from: "wei", to: "lucia", status: "pending", hoursAgo: 6 },
  { from: "layla", to: "kenji", status: "pending", hoursAgo: 3 },
  { from: "maya", to: "anna", status: "pending", hoursAgo: 1 },
];

// unread is how many trailing messages the unreadBy user has not read.
const THREADS = [
  {
    a: "maya",
    b: "lucia",
    unreadBy: "maya",
    unread: 2,
    lines: [
      ["maya", "Hola Lucía. I am learning Spanish for a trip to Madrid."],
      ["lucia", "Hola Maya. Welcome. I am happy to help you practise."],
      ["maya", "Gracias. I can also chat in Hindi or English."],
      ["lucia", "Perfecto. I want to sound natural in English."],
      ["maya", "We can go slowly. How do you say nice to meet you?"],
      ["lucia", "Mucho gusto. It means nice to meet you."],
      ["lucia", "¿Cómo estás?"],
      ["lucia", "I am a teacher, so I am patient with learners."],
    ],
  },
  {
    a: "kenji",
    b: "maya",
    lines: [
      ["kenji", "Hello Maya. I am Kenji, from Osaka."],
      ["maya", "Hello Kenji. こんにちは."],
      ["kenji", "こんにちは. I want to practise English, and I can help with Japanese."],
      ["maya", "Thank you. I like films too."],
      ["kenji", "I like films as well. Do you want a simple phrase?"],
      ["maya", "Yes. ありがとう."],
    ],
  },
  {
    a: "maya",
    b: "pierre",
    lines: [
      ["maya", "Bonjour Pierre. I would like to practise with you."],
      ["pierre", "Bonjour Maya. I am learning Spanish, and I live in Lyon."],
      ["maya", "Merci. I am learning Spanish for a trip."],
      ["pierre", "We can chat in English and simple French. Comment ça va ?"],
    ],
  },
  {
    a: "lucia",
    b: "anna",
    lines: [
      ["lucia", "Hello Anna. I am Lucía, from Madrid."],
      ["anna", "Hallo Lucía. I live in Berlin and I am learning English."],
      ["lucia", "I am a teacher. We can practise English together."],
      ["anna", "That sounds good. I like calm conversations."],
      ["anna", "Wie geht es dir?"],
    ],
  },
  {
    a: "kenji",
    b: "hana",
    lines: [
      ["kenji", "Hello Hana. I am Kenji."],
      ["hana", "안녕하세요. I am Hana, from Seoul."],
      ["kenji", "안녕하세요. I want to practise English."],
      ["hana", "I am learning English too. Nice to meet you."],
    ],
  },
  {
    a: "maya",
    b: "hana",
    lines: [],
  },
];

function channelId(a, b) {
  return [String(a), String(b)].sort().join("-");
}

function pairKey(a, b) {
  const left = String(a);
  const right = String(b);
  return left < right ? `${left}_${right}` : `${right}_${left}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redact(text, secret) {
  let value = sanitiseDbMessage(text);
  if (typeof secret === "string" && secret.length >= 8) {
    value = value.split(secret).join("[redacted]");
  }
  return value;
}

function say(log, secret, line) {
  log(redact(line, secret));
}

function errorText(error, secret) {
  const name = error instanceof Error ? error.name : "Error";
  const message = redact(error instanceof Error ? error.message : error?.message || "", secret);
  return `${name}: ${message.slice(0, 300)}`;
}

function hardDeleteBlocked(error) {
  const message = `${error?.message || ""} ${error?.response?.data?.message || ""}`.toLowerCase();
  if (!message.includes("hard")) return false;
  const status = Number(error?.status || error?.code || error?.response?.status);
  return (
    status === 400 ||
    status === 403 ||
    /not allowed|not enabled|disabled|permission|not supported|upgrade|plan|feature|forbidden/.test(
      message
    )
  );
}

function profileOf(person, id) {
  return {
    fullName: person.fullName,
    bio: person.bio,
    nativeLanguage: person.nativeLanguage,
    learningLanguage: person.learningLanguage,
    location: person.location,
    profilePic: `https://api.dicebear.com/9.x/lorelei/svg?seed=${id}`,
  };
}

function assertPlan(ids) {
  const keys = new Set(PEOPLE.map((person) => person.key));
  for (const request of REQUESTS) {
    if (!keys.has(request.from) || !keys.has(request.to)) {
      throw new Error("Refusing to seed: a friend request names an unknown user.");
    }
  }
  for (const thread of THREADS) {
    if (!keys.has(thread.a) || !keys.has(thread.b)) {
      throw new Error("Refusing to seed: a conversation names an unknown user.");
    }
    for (const [from] of thread.lines) {
      if (!keys.has(from)) throw new Error("Refusing to seed: a message names an unknown user.");
    }
  }

  const emails = new Set();
  for (const person of PEOPLE) {
    if (!EMAIL_RE.test(person.email) || person.email.length > 254) {
      throw new Error(`Refusing to seed: ${person.fullName} has an invalid email.`);
    }
    if (emails.has(person.email)) {
      throw new Error(`Refusing to seed: duplicate email for ${person.fullName}.`);
    }
    emails.add(person.email);
    const parsed = onboardSchema.safeParse(profileOf(person, ids.get(person.key)));
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "invalid profile";
      throw new Error(
        `Refusing to seed: ${person.fullName} does not pass onboarding checks (${issue}).`
      );
    }
  }
}

function friendSets() {
  const sets = new Map(PEOPLE.map((person) => [person.key, new Set()]));
  for (const request of REQUESTS) {
    if (request.status !== "accepted") continue;
    sets.get(request.from).add(request.to);
    sets.get(request.to).add(request.from);
  }
  return sets;
}

async function taggedStreamIds(stream) {
  const ids = [];
  const limit = 100;
  for (let offset = 0; offset < 1000; offset += limit) {
    const response = await stream.queryUsers({ seed: SEED_TAG }, { id: 1 }, { limit, offset });
    const batch = Array.isArray(response?.users) ? response.users : [];
    for (const user of batch) {
      if (user?.id) ids.push(String(user.id));
    }
    if (batch.length < limit) break;
  }
  return ids;
}

async function waitForTask(stream, taskId, secret) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const task = await stream.getTask(taskId);
    const status = String(task?.status || "").toLowerCase();
    if (status === "completed") return { blocked: false };
    if (status === "failed" || task?.error) {
      const detail = redact(
        task?.error?.description || task?.error?.message || status || "failed",
        secret
      ).slice(0, 300);
      if (hardDeleteBlocked({ message: detail })) return { blocked: true, detail };
      throw new Error(`Stream delete task failed: ${detail}`);
    }
    await delay(1000);
  }
  throw new Error("Stream delete task timed out after 90 seconds.");
}

async function hardDeleteUsers(stream, ids, log, secret) {
  const unique = [...new Set(ids.map(String).filter(Boolean))];
  if (unique.length === 0) return { blocked: false };
  for (let index = 0; index < unique.length; index += DELETE_USER_BATCH) {
    const batch = unique.slice(index, index + DELETE_USER_BATCH);
    let task;
    try {
      task = await stream.deleteUsers(batch, HARD_DELETE);
    } catch (error) {
      if (hardDeleteBlocked(error)) {
        say(
          log,
          secret,
          `Warning: Stream refused a hard delete (${errorText(error, secret)}). Continuing without deleting those Stream users.`
        );
        return { blocked: true };
      }
      throw new Error(`Stream deleteUsers failed: ${errorText(error, secret)}`, { cause: error });
    }
    if (!task?.task_id) {
      say(log, secret, "Warning: Stream deleteUsers did not return a task id. Continuing.");
      continue;
    }
    const outcome = await waitForTask(stream, task.task_id, secret);
    if (outcome.blocked) {
      say(
        log,
        secret,
        `Warning: Stream hard delete is not allowed (${outcome.detail}). Continuing without deleting those Stream users.`
      );
      return { blocked: true };
    }
  }
  return { blocked: false };
}

async function writeBackup(backupDir, database, users, requests) {
  await mkdir(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const finalPath = path.join(backupDir, `seed-backup-${stamp}.json`);
  const tmpPath = `${finalPath}.tmp`;
  const body = JSON.stringify(
    {
      database,
      createdAt: new Date().toISOString(),
      users,
      friendRequests: requests,
    },
    null,
    2
  );
  const handle = await open(tmpPath, "w", 0o600);
  try {
    await handle.writeFile(body, "utf8");
  } finally {
    await handle.close();
  }
  await chmod(tmpPath, 0o600);
  await rename(tmpPath, finalPath);
  await chmod(finalPath, 0o600);
  return finalPath;
}

async function createUsers(User, ids, sets, now, password) {
  for (let index = 0; index < PEOPLE.length; index += 1) {
    const person = PEOPLE[index];
    const id = ids.get(person.key);
    const createdAt = new Date(now.getTime() - (10 + index) * DAY);
    const plain = person.login ? password : randomBytes(24).toString("hex");
    const doc = new User({
      _id: id,
      fullName: person.fullName,
      email: person.email,
      password: plain,
      bio: person.bio,
      profilePic: `https://api.dicebear.com/9.x/lorelei/svg?seed=${id}`,
      nativeLanguage: person.nativeLanguage,
      learningLanguage: person.learningLanguage,
      location: person.location,
      isOnboarded: true,
      friends: [...sets.get(person.key)].map((key) => ids.get(key)),
      createdAt,
      updatedAt: createdAt,
    });
    await doc.save({ timestamps: false });
  }
}

async function createRequests(FriendRequest, ids, now) {
  for (const request of REQUESTS) {
    const createdAt = new Date(now.getTime() - request.hoursAgo * HOUR);
    const updatedAt =
      request.status === "accepted" ? new Date(createdAt.getTime() + 30 * 60 * 1000) : createdAt;
    const sender = ids.get(request.from);
    const recipient = ids.get(request.to);
    const doc = new FriendRequest({
      sender,
      recipient,
      status: request.status,
      pairKey: pairKey(sender, recipient),
      createdAt,
      updatedAt,
    });
    await doc.save({ timestamps: false });
  }
}

function epoch(value) {
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function messageTime(now, index, total) {
  const start = now.getTime() - 3 * DAY;
  const end = now.getTime() - DAY;
  const at = start + ((end - start) * index) / Math.max(total - 1, 1);
  return new Date(at).toISOString();
}

async function deliver(channel, fields, state) {
  const message = { text: fields.text, user_id: fields.userId };
  if (state.mode === "ok" && fields.createdAt) message.created_at = fields.createdAt;
  try {
    const response = await channel.sendMessage(message, { skip_push: true });
    if (message.created_at) {
      const got = epoch(response?.message?.created_at);
      const want = epoch(message.created_at);
      if (!Number.isFinite(got) || Math.abs(got - want) > 60_000) state.mode = "ignored";
    }
    return response;
  } catch (error) {
    if (!message.created_at) throw error;
    state.mode = "rejected";
    return channel.sendMessage(
      { text: fields.text, user_id: fields.userId },
      { skip_push: true }
    );
  }
}

async function seedChannels(stream, ids, now) {
  const state = { mode: "ok" };
  for (const thread of THREADS) {
    const left = String(ids.get(thread.a));
    const right = String(ids.get(thread.b));
    const id = channelId(left, right);
    const createdBy = thread.lines.length
      ? String(ids.get(thread.lines[0][0]))
      : left;
    const channel = stream.channel("messaging", id, {
      members: [left, right],
      created_by_id: createdBy,
    });
    try {
      await channel.create();
    } catch (error) {
      const message = String(error?.message || "").toLowerCase();
      if (!message.includes("already exists")) throw error;
    }

    const cut = thread.lines.length - (thread.unread || 0);
    for (let index = 0; index < thread.lines.length; index += 1) {
      if (thread.unreadBy && index === cut) {
        await channel.markRead({ user_id: String(ids.get(thread.unreadBy)) });
      }
      const [from, text] = thread.lines[index];
      await deliver(
        channel,
        {
          text,
          userId: String(ids.get(from)),
          createdAt: index < cut ? messageTime(now, index, Math.max(cut, 1)) : undefined,
        },
        state
      );
    }
    if (thread.lines.length > 0) {
      for (const reader of [thread.a, thread.b]) {
        if (reader === thread.unreadBy) continue;
        await channel.markRead({ user_id: String(ids.get(reader)) });
      }
    }
  }

  if (state.mode === "ignored") {
    return "Stream ignored created_at. Later messages were sent without timestamps.";
  }
  if (state.mode === "rejected") {
    return "Stream rejected created_at. Messages were sent without timestamps.";
  }
  return "created_at was accepted.";
}

function counts() {
  const messages = THREADS.reduce((sum, thread) => sum + thread.lines.length, 0);
  return {
    users: PEOPLE.length,
    requests: REQUESTS.length,
    channels: THREADS.length,
    messages,
  };
}

export async function runSeed({
  mongoose,
  models,
  stream,
  env: seedEnv = {},
  log = console.log,
  now = new Date(),
  backupDir = defaultBackupDir,
  apply = false,
  confirm,
  skipStream = false,
  force = false,
} = {}) {
  const User = models?.User;
  const FriendRequestModel = models?.FriendRequest;
  if (!mongoose || !User || !FriendRequestModel) {
    throw new Error("Refusing to seed: mongoose and models are required.");
  }
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Refusing to seed: the database is not connected.");
  }

  const database = getDbName();
  if (!database) throw new Error("Refusing to seed: the database name is empty.");

  const password = seedEnv.DEMO_PASSWORD;
  const tell = (line) => say(log, password, line);
  const moment = now instanceof Date ? now : new Date(now);

  if (seedEnv.NODE_ENV === "production" && !force) {
    throw new Error("Refusing to seed: NODE_ENV is production. Pass --force to run anyway.");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new Error(
      "Refusing to seed: DEMO_PASSWORD is missing or shorter than 8 characters."
    );
  }
  if (apply) {
    if (!confirm) {
      throw new Error("Refusing to seed: --apply needs --confirm=<database name>.");
    }
    if (confirm !== database) {
      throw new Error(
        `Refusing to seed: --confirm must exactly match the database name (${database}).`
      );
    }
  }
  if (!skipStream && !stream) {
    throw new Error(
      "Refusing to seed: a Stream client is required. Pass --no-stream to skip Stream."
    );
  }

  const ids = new Map(PEOPLE.map((person) => [person.key, new mongoose.Types.ObjectId()]));
  assertPlan(ids);

  const existingUsers = await User.find().select("_id").lean();
  const mongoIds = existingUsers.map((user) => String(user._id));
  const requestCount = await FriendRequestModel.countDocuments();
  let streamIds = [];
  if (!skipStream) {
    try {
      streamIds = await taggedStreamIds(stream);
    } catch (error) {
      throw new Error(`Could not list Stream users: ${errorText(error, password)}`, { cause: error });
    }
  }
  const deleteIds = [...new Set([...mongoIds, ...streamIds])];
  const plan = counts();

  tell(`Database: ${database}`);
  if (!apply) {
    tell("Dry run. Nothing will be written.");
    tell(`Would delete ${mongoIds.length} users and ${requestCount} friend requests.`);
    tell(
      skipStream
        ? "Stream: skipped (--no-stream). Would delete 0 Stream users."
        : `Would delete ${deleteIds.length} Stream users.`
    );
    tell(
      `Would create ${plan.users} users, ${plan.requests} friend requests, ${plan.channels} channels, and ${plan.messages} messages.`
    );
    tell(
      `A real run writes a backup under ${backupDir} before deleting anything. That folder is gitignored. The backup may contain password hashes.`
    );
    tell(
      "The password for Maya, Lucía, and Kenji is the DEMO_PASSWORD value in the environment. It is not printed here."
    );
    return { applied: false, database };
  }

  const usersForBackup = await User.find().select("+password").lean();
  const requestsForBackup = await FriendRequestModel.find().lean();
  const backupPath = await writeBackup(backupDir, database, usersForBackup, requestsForBackup);
  tell(`Backup: ${backupPath}`);
  tell("That folder is gitignored. The backup may contain password hashes.");

  try {
    if (skipStream) {
      tell("Stream: skipped (--no-stream).");
    } else {
      await hardDeleteUsers(stream, deleteIds, log, password);
    }

    await User.deleteMany({});
    await FriendRequestModel.deleteMany({});
    await createUsers(User, ids, friendSets(), moment, password);
    await createRequests(FriendRequestModel, ids, moment);

    if (!skipStream) {
      await stream.upsertUsers(
        PEOPLE.map((person) => {
          const id = String(ids.get(person.key));
          return {
            id,
            name: person.fullName,
            image: `https://api.dicebear.com/9.x/lorelei/svg?seed=${id}`,
            seed: SEED_TAG,
          };
        })
      );
      const timestampNote = await seedChannels(stream, ids, moment);
      tell(`Stream: ${timestampNote}`);
    }
  } catch (error) {
    const message = redact(error instanceof Error ? error.message : "Seed failed", password);
    throw new Error(`${message} Backup: ${backupPath}`, { cause: error });
  }

  tell(`Deleted ${mongoIds.length} users and ${requestCount} friend requests.`);
  tell(
    `Created ${plan.users} users, ${plan.requests} friend requests, ${plan.channels} channels, and ${plan.messages} messages.`
  );
  tell("Name                    Email");
  for (const person of PEOPLE) {
    tell(`${person.fullName.padEnd(24)}${person.login ? person.email : ""}`);
  }
  tell(
    "The password for Maya, Lucía, and Kenji is the DEMO_PASSWORD value in the environment. It is not printed here."
  );

  return { applied: true, database, backupPath };
}

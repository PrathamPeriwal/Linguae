import dotenv from "dotenv";
import { z } from "zod";

// Load backend/.env without overriding variables already set (hosts, tests).
// DOTENV_CONFIG_PATH points at a different file when a test must not read .env.
dotenv.config(
  process.env.DOTENV_CONFIG_PATH ? { path: process.env.DOTENV_CONFIG_PATH } : {}
);

const DEV_ORIGIN = "http://localhost:5173";

function blank(value) {
  return value == null || (typeof value === "string" && value.trim() === "");
}

function optionalString(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function parseOrigins(value) {
  if (typeof value !== "string" || value.trim() === "") return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.preprocess(
      (value) => (blank(value) ? undefined : value),
      z.coerce.number().int().positive().max(65535).default(5001)
    ),
    MONGO_URI: z.string().min(1),
    JWT_SECRET_KEY: z.string().min(1),
    STREAM_API_KEY: z.string().min(1),
    STREAM_API_SECRET: z.string().min(1),
  });

function failureLine(issue, raw) {
  const name = String(issue.path[0] ?? "environment");
  if (name === "JWT_SECRET_KEY" && issue.code === "custom") {
    return `${name} must be at least 32 characters in production`;
  }
  if (blank(raw[name])) return `${name} is missing`;
  return `${name} is invalid`;
}

function reportInvalid(error, raw) {
  const lines = new Map();
  for (const issue of error.issues) {
    const name = String(issue.path[0] ?? "environment");
    const line = failureLine(issue, raw);
    if (!lines.has(name) || issue.code === "custom") lines.set(name, line);
  }
  console.error("Invalid environment configuration:");
  for (const line of lines.values()) console.error(`- ${line}`);
  process.exit(1);
}

const raw = {
  NODE_ENV: optionalString(process.env.NODE_ENV),
  PORT: optionalString(process.env.PORT),
  MONGO_URI: optionalString(process.env.MONGO_URI),
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
  STREAM_API_KEY: optionalString(process.env.STREAM_API_KEY),
  STREAM_API_SECRET: optionalString(process.env.STREAM_API_SECRET),
};

const parsed = schema.safeParse(raw);
const issues = parsed.success ? [] : [...parsed.error.issues];
const nodeEnv = parsed.success ? parsed.data.NODE_ENV : raw.NODE_ENV;
if (
  nodeEnv === "production" &&
  typeof raw.JWT_SECRET_KEY === "string" &&
  raw.JWT_SECRET_KEY.length > 0 &&
  raw.JWT_SECRET_KEY.length < 32
) {
  issues.push({ code: "custom", path: ["JWT_SECRET_KEY"] });
}
if (issues.length > 0) reportInvalid({ issues }, raw);

const configuredOrigins = parseOrigins(process.env.FRONTEND_ORIGINS);
const legacyOrigins = parseOrigins(process.env.FRONTEND_ORIGIN);
const fromEnv = configuredOrigins.length > 0 ? configuredOrigins : legacyOrigins;
const allowlist =
  fromEnv.length > 0
    ? fromEnv
    : parsed.data.NODE_ENV === "production"
      ? []
      : [DEV_ORIGIN];

const cspEnforce = optionalString(process.env.CSP_ENFORCE)?.toLowerCase() === "true";

export const env = Object.freeze({
  NODE_ENV: parsed.data.NODE_ENV,
  PORT: parsed.data.PORT,
  MONGO_URI: parsed.data.MONGO_URI,
  JWT_SECRET_KEY: parsed.data.JWT_SECRET_KEY,
  STREAM_API_KEY: parsed.data.STREAM_API_KEY,
  STREAM_API_SECRET: parsed.data.STREAM_API_SECRET,
  FRONTEND_ORIGINS: Object.freeze(allowlist),
  CSP_ENFORCE: cspEnforce,
});

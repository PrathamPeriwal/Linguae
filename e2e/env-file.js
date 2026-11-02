import { readFileSync } from "node:fs";

export function loadEnvFile(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    throw new Error(`STOP: cannot read ${file}`);
  }
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

export function assertDevDatabase(env) {
  const name = env.MONGO_DB_NAME;
  if (!name || !name.endsWith("-dev")) {
    throw new Error("STOP: MONGO_DB_NAME is missing or does not end in -dev");
  }
  if (!env.DEMO_PASSWORD) {
    throw new Error("STOP: DEMO_PASSWORD is missing");
  }
}

import Heartbeat, { recordHeartbeat } from "../models/Heartbeat.js";

const START_GAP_MS = 5 * 60 * 60 * 1000;
const INTERVAL_MS = 6 * 60 * 60 * 1000;

let timer = null;

function logError(error) {
  const name = error instanceof Error ? error.name : "Error";
  const message = String(error instanceof Error ? error.message : "").replace(
    /mongodb(?:\+srv)?:\/\/\S+/gi,
    "[redacted]"
  );
  console.error(name, message);
}

export { recordHeartbeat };

export async function startHeartbeat() {
  try {
    const existing = await Heartbeat.findById("main").lean();
    const last = existing?.lastBeatAt ? new Date(existing.lastBeatAt).getTime() : NaN;
    if (!Number.isFinite(last) || Date.now() - last > START_GAP_MS) {
      await recordHeartbeat();
    }
  } catch (error) {
    logError(error);
  }

  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    recordHeartbeat().catch(logError);
  }, INTERVAL_MS);
  timer.unref();
}

export function stopHeartbeat() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

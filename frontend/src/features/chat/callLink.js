export const CALL_LINK_PREFIX = "I've started a video call. Join me here: ";

export function callUrlFromText(text) {
  if (typeof text !== "string" || typeof window === "undefined") return "";
  const trimmed = text.trim();
  const candidate = trimmed.startsWith(CALL_LINK_PREFIX)
    ? trimmed.slice(CALL_LINK_PREFIX.length).trim()
    : trimmed;
  if (!candidate || /\s/.test(candidate)) return "";
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return "";
  }
  if (url.origin !== window.location.origin) return "";
  if (!/^\/call\/[^/]+$/.test(url.pathname)) return "";
  if (url.search || url.hash) return "";
  return candidate;
}

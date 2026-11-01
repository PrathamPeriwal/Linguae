import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Report-only unless CSP_ENFORCE=true. Leave it report-only until the browser
// console has been checked for violations. Do not enforce a policy that is still firing.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function inlineScriptHashes(html) {
  const hashes = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    const attrs = match[1] || "";
    if (/(^|\s)src\s*=/i.test(attrs)) continue;
    const body = match[2];
    if (!body || body.trim() === "") continue;
    // The HTML parser turns CR and CRLF into LF before the browser hashes the script.
    const normalised = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const digest = createHash("sha256").update(normalised).digest("base64");
    hashes.push(`'sha256-${digest}'`);
  }
  return hashes;
}

function hashesFrom(file) {
  if (!existsSync(file)) return [];
  return inlineScriptHashes(readFileSync(file, "utf8"));
}

// Hash the theme script from source and from the built file. The HTML parser
// turns CR and CRLF into LF before hashing, so the digest is computed from LF text.
const scriptSrc = [
  "'self'",
  ...new Set([
    ...hashesFrom(path.join(repoRoot, "frontend", "index.html")),
    ...hashesFrom(path.join(repoRoot, "frontend", "dist", "index.html")),
  ]),
];

// Hosts the SPA actually contacts:
// flagcdn.com — language flags. api.dicebear.com and avatar.iran.liara.run — avatars.
// *.stream-io-api.com — Stream Chat and Video HTTPS/WSS (chat.stream-io-api.com, video.stream-io-api.com).
// *.stream-io-video.com — Stream Video edge / SFU (sfu-….stream-io-video.com).
// *.getstream.io — Stream product hosts such as chat insights.
// *.stream-io-cdn.com — Stream CDN images and attachments (region subdomains change).
// data: — the grain texture in CSS. blob: — camera preview, media, and workers.
export const cspDirectives = {
  "default-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "frame-ancestors": ["'none'"],
  "script-src": scriptSrc,
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://flagcdn.com",
    "https://api.dicebear.com",
    "https://avatar.iran.liara.run",
    "https://*.stream-io-cdn.com",
  ],
  "media-src": ["'self'", "blob:", "https://*.stream-io-cdn.com"],
  "font-src": ["'self'", "data:"],
  "connect-src": [
    "'self'",
    "https://*.stream-io-api.com",
    "wss://*.stream-io-api.com",
    "https://*.stream-io-video.com",
    "wss://*.stream-io-video.com",
    "https://*.getstream.io",
    "wss://*.getstream.io",
    "https://*.stream-io-cdn.com",
  ],
  "worker-src": ["'self'", "blob:"],
};

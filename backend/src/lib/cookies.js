import { env } from "../config/env.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function jwtCookieOptions(withMaxAge = false) {
  const options = {
    httpOnly: true,
    sameSite: "strict",
    secure: env.NODE_ENV === "production",
    path: "/",
  };
  if (withMaxAge) options.maxAge = WEEK_MS;
  return options;
}

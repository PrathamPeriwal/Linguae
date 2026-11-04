import rateLimit from "express-rate-limit";

const TOO_MANY = "Too many requests, please try again later.";

// The default store is in-memory. Counters reset when the process restarts.
function limiter({ windowMs, limit, skipSuccessfulRequests = false, skip }) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    skip,
    standardHeaders: true,
    legacyHeaders: false,
    handler(_req, res) {
      res.status(429).json({ message: TOO_MANY });
    },
  });
}

export function createRateLimiters(limits = {}) {
  return {
    api: limiter({
      windowMs: 15 * 60 * 1000,
      limit: limits.api ?? 300,
    }),
    // Successful logins (status < 400) are not counted.
    login: limiter({
      windowMs: 15 * 60 * 1000,
      limit: limits.login ?? 10,
      skipSuccessfulRequests: true,
      // The browser sends a CORS preflight before a cross-origin POST. Don't count it.
      skip: (req) => req.method !== "POST",
    }),
    signup: limiter({
      windowMs: 60 * 60 * 1000,
      limit: limits.signup ?? 5,
      skip: (req) => req.method !== "POST",
    }),
  };
}

import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { health } from "./controllers/health.controller.js";
import { cspDirectives } from "./config/csp.js";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { createRateLimiters } from "./middleware/rateLimit.middleware.js";
import authRoutes from "./routes/auth.route.js";
import chatRoutes from "./routes/chat.route.js";
import userRoutes from "./routes/user.route.js";
import { asyncHandler } from "./utils/asyncHandler.js";

const defaultDistPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../frontend/dist"
);

function staticHeaders(res, filePath) {
  const normalised = String(filePath).split(path.sep).join("/");
  res.setHeader(
    "Cache-Control",
    normalised.includes("/assets/")
      ? "public, max-age=31536000, immutable"
      : "no-cache"
  );
}

function mountStatic(app, distPath) {
  app.use(
    express.static(distPath, {
      index: false,
      cacheControl: false,
      setHeaders: staticHeaders,
    })
  );

  // Extensionless GET paths are the SPA. A missing file that has an extension
  // (for example /assets/old.js) stays a 404 and is not rewritten to index.html.
  app.get("*", (req, res, next) => {
    if (req.path === "/api" || req.path.startsWith("/api/")) {
      next();
      return;
    }
    if (path.posix.extname(req.path)) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(distPath, "index.html"), (error) => {
      if (error) next(error);
    });
  });
}

export function createApp(options = {}) {
  const app = express();
  const { api, login, signup } = createRateLimiters(options.limits);
  const distPath = options.distPath || defaultDistPath;

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      // Same-origin SPA. COEP require-corp would block flag, avatar, and Stream images.
      crossOriginEmbedderPolicy: false,
      // Report-only until the browser console has been checked for violations.
      // CSP_ENFORCE=true sends Content-Security-Policy instead of the report-only header.
      contentSecurityPolicy: {
        useDefaults: false,
        reportOnly: !env.CSP_ENFORCE,
        directives: cspDirectives,
      },
    })
  );

  app.use((_req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(self)");
    next();
  });

  app.use((req, _res, next) => {
    const origin = req.get("origin");
    // No Origin header: non-browser clients. Same host: the SPA calling its own API.
    // FRONTEND_ORIGINS is the only cross-origin allowlist. Production's default is empty.
    const sameHost = origin === `${req.protocol}://${req.get("host")}`;
    if (!origin || sameHost || env.FRONTEND_ORIGINS.includes(origin)) {
      next();
      return;
    }
    const error = new Error("Origin not allowed");
    error.type = "cors";
    error.status = 403;
    next(error);
  });

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.FRONTEND_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    })
  );

  app.use(compression());

  // "dev" in development, "tiny" otherwise. Neither format logs bodies or cookies.
  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "development" ? "dev" : "tiny"));
  }

  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());

  app.use("/api", api);
  app.get("/api/health", asyncHandler(health));
  // Login and signup sit on top of the general /api limiter. Stream token and
  // health use only that general limiter.
  app.use("/api/auth/login", login);
  app.use("/api/auth/signup", signup);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api", notFound);

  if (env.NODE_ENV === "production") {
    mountStatic(app, distPath);
  }

  app.use(errorHandler);
  return app;
}

export const app = createApp();

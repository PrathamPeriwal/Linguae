# Linguae

A language exchange app. You sign up, say which language you speak and which you are learning, find someone, send a friend request, chat one to one, and start a one-to-one video call.

## What it does

- Sign up and log in with email, password, and full name. The session is a JWT in an httpOnly cookie named `jwt`.
- Onboarding: name, bio, location, avatar, native language, and the language you are learning.
- Discover onboarded people. Search by name and filter by native language. Both have to match.
- Send and accept friend requests.
- One-to-one chat (Stream Chat).
- One-to-one video call from a chat (Stream Video). The call link is a message in that chat.
- Dark and light themes, saved in the browser.

It does not match people by complementary languages, show live presence, host group calls, record calls, or keep message notifications. Recommendations are other onboarded users who are not already your friends.

## Tech

- Frontend: React 19, Vite 6, React Router 7, TanStack Query, Tailwind CSS, Zustand (theme only), Motion, Radix primitives, Stream Chat and Stream Video.
- Backend: Node.js, Express 4, Mongoose, MongoDB, JWT, Stream Chat (server SDK, used to upsert users and mint tokens).

## Layout

```
linguae/
├── backend/src/
│   ├── server.js        connect, listen, shutdown
│   ├── app.js           express app
│   ├── config/          env, content security policy
│   ├── controllers/     auth, users, chat token, health
│   ├── models/          User, FriendRequest, Heartbeat
│   ├── routes/
│   ├── middleware/      protectRoute, errors, rate limits
│   ├── seed/            demo users, requests, and chats
│   └── lib/             db, stream, cookies, heartbeat
└── frontend/src/
    ├── app/             shell, routes, query client
    ├── components/ui/   buttons, fields, toast, and the rest of the kit
    ├── components/layout/
    ├── features/        auth, onboarding, landing, discover, friends, requests, chat, call
    ├── lib/
    ├── pages/           thin route components
    ├── store/           theme
    └── styles/
```

## Environment

Copy `backend/.env.example` to `backend/.env`. Names below are the ones the server reads. A missing or invalid value prints the variable name and exits. Values are not printed.

### Backend (`backend/.env`)

| Name | Required | What it does |
|---|---|---|
| `NODE_ENV` | No | `development` (default), `production`, or `test`. |
| `PORT` | No | HTTP port. Default `5001`. |
| `MONGO_URI` | Yes | MongoDB connection string. The log line shows the host and database name only. |
| `MONGO_DB_NAME` | No | Database name passed to MongoDB. When set, it overrides the database in `MONGO_URI`. Set this in development so the app and the demo seed do not use the original database. |
| `DEMO_PASSWORD` | No | Only read by `scripts/seed-demo.js`. Not required to start the server. At least 8 characters. |
| `JWT_SECRET_KEY` | Yes | Signs the session cookie. At least 32 characters in production. |
| `STREAM_API_KEY` | Yes | Stream Chat server key. Same Stream app as `VITE_STREAM_API_KEY`. |
| `STREAM_API_SECRET` | Yes | Stream Chat server secret. |
| `FRONTEND_ORIGINS` | No | Comma-separated browser origins allowed to call the API with cookies. |
| `FRONTEND_ORIGIN` | No | Legacy single origin, used only when `FRONTEND_ORIGINS` is empty. |
| `CSP_ENFORCE` | No | `true` enforces Content-Security-Policy. Anything else, including empty, is report-only. |

Set `STREAM_API_KEY` and `STREAM_API_SECRET`. The server does not accept another prefix for those two.

With `FRONTEND_ORIGINS` empty, development allows `http://localhost:5173`. Production allows no other origin. The SPA is served from this process, so a same-origin request is still allowed. A request with no `Origin` header is allowed. Any other origin gets `403` `{ "message": "Origin not allowed" }`.

### Frontend (`frontend/.env`)

| Name | Read in |
|---|---|
| `VITE_STREAM_API_KEY` | chat and call. This one is spelled STREAM. It must be the same Stream app as the backend key. |
| `VITE_API_BASE_URL_DEV` | `lib/axios.js` when Vite is in development. Fallback `http://localhost:5001/api`. |
| `VITE_API_BASE_URL` | `lib/axios.js` for any other mode. Fallback `/api`. |

## Run locally

Node 20 or newer. MongoDB has to be reachable. Chat and video need a Stream app. The process checks the environment, connects to MongoDB, then listens. `GET /api/health` needs no cookie and returns `{ "status": "ok", "db": "up", "uptime": <seconds> }` when the database answers a ping, or `503` with `"db": "down"`.

```bash
cd backend
npm install
npm run dev
```

Lint and tests (the tests use an in-memory MongoDB and do not call Stream):

```bash
npm run lint
npm test
```

The API listens on `http://localhost:5001`.

```bash
cd frontend
npm install
npm run dev
```

The app is at `http://localhost:5173`.

## Demo data

`npm run seed:demo` (from `backend/`) fills a database with 10 onboarded users, friend requests, and a few Stream chats. The default is a dry run: it prints the database name and what it would delete and create, and it writes nothing.

Set `MONGO_DB_NAME` to a development database, and set `DEMO_PASSWORD` to at least 8 characters. The server does not need `DEMO_PASSWORD` to start. The seed reads that value and never prints it. Three users can log in with it: `maya@linguae.demo`, `lucia@linguae.demo`, and `kenji@linguae.demo`.

```bash
cd backend
npm run seed:demo
npm run seed:demo -- --apply --confirm=<the database name the dry run printed>
```

On PowerShell, `npm` is a shim that swallows those flags. Use `npm.cmd run seed:demo -- --apply --confirm=<name>`, or `node scripts/seed-demo.js --apply --confirm=<name>`.

`--apply` writes only when `--confirm` is exactly the connected database name. `--no-stream` skips Stream. `--force` is also required when `NODE_ENV` is production.

Before it deletes anything, it writes `backend/backups/seed-backup-<timestamp>.json` (mode `0600`). That folder is gitignored. The file may contain password hashes. The seed then deletes every document in `users` and `friendrequests`, and hard-deletes the matching Stream users (those Mongo ids, plus any Stream user tagged `seed: "linguae-demo"`). It does not delete `system_heartbeat`.

To point the same command at the production database: remove `MONGO_DB_NAME` or change it to that database, run the dry run, and pass the real database name to `--confirm`. Add `--force` when `NODE_ENV` is production. Do not commit the password or the database name.

`npm run verify:demo` logs in as the three demo users and checks friends, requests, and Maya's Stream channels. It takes an optional base URL (default `http://localhost:5001`).

## Deploy

Production is one origin. Express serves `frontend/dist` when `NODE_ENV` is `production`. The dist path is resolved from the server file, so the working directory does not matter. Hashed files under `/assets/` are cached for a year. `index.html` is `Cache-Control: no-cache`. A missing file that has an extension returns 404. Other GET paths return `index.html`.

`SIGTERM` and `SIGINT` stop new connections, close MongoDB, and exit. If that takes more than 10 seconds the process exits anyway.

From the repo root:

```bash
npm run build
```

That installs both packages and builds the frontend. Then, from `backend/`, with `NODE_ENV=production` and the env vars set:

```bash
npm start
```

`npm start` from the repo root runs the backend the same way, but it does not set `NODE_ENV` for you. Without `NODE_ENV=production` the server does not serve the built frontend. Content-Security-Policy is report-only until `CSP_ENFORCE=true`.

## Keeping the demo awake

`GET /api/health` needs no cookie. It returns `{ "status": "ok", "db": "up", "uptime": <seconds> }` when MongoDB answers a ping.

The process also writes one `system_heartbeat` document. It writes at startup only when the last beat is older than 5 hours, then every 6 hours after that. A failure is logged and does not stop the server. `SIGTERM` and `SIGINT` clear that timer.

Render's free services spin down after 15 minutes without traffic. A free monitor such as UptimeRobot or cron-job.org can call `GET /api/health` every 10 minutes and keep the process awake. Keeping one service awake all month uses about 720 to 744 of the 750 free hours.

Atlas free clusters pause automatically after a period of inactivity. The current docs say 30 days. Any real connection counts, including the health check's ping and the 6-hour heartbeat write.

## End-to-end tests

The Playwright suite lives in `e2e/`. See `e2e/README.md`. It builds the frontend, starts this API in production on port 5099 with Content-Security-Policy enforced, and seeds the development database named by `MONGO_DB_NAME`. That name must end in `-dev`. The suite seeds again when it stops. It does not edit `.env` files.

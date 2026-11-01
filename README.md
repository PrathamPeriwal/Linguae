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
│   ├── server.js
│   ├── controllers/     auth, users, chat token
│   ├── models/          User, FriendRequest
│   ├── routes/
│   ├── middleware/      protectRoute
│   └── lib/             db, stream
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

There is no `.env.example`. Names below are the ones the code reads today.

### Backend (`backend/.env`)

| Name | Read in |
|---|---|
| `PORT` | `server.js` (fallback `5001`) |
| `NODE_ENV` | CORS, the cookie `secure` flag, and static file serving |
| `MONGO_URI` | `lib/db.js` |
| `JWT_SECRET_KEY` | auth controller and `protectRoute` |
| `STEAM_API_KEY` | `lib/stream.js` |
| `STEAM_API_SECRET` | `lib/stream.js` |
| `FRONTEND_ORIGINS` | `server.js` (comma-separated). `FRONTEND_ORIGIN` is the fallback. |

`STEAM_API_KEY` and `STEAM_API_SECRET` are misspelled. The code does not read `STREAM_API_KEY` or `STREAM_API_SECRET`. That spelling is staying until a later backend change. If you "correct" the names, the server will not see a key.

`FRONTEND_ORIGINS` is parsed and then not used. In development the CORS allowlist is hardcoded to `http://localhost:5173`.

### Frontend (`frontend/.env`)

| Name | Read in |
|---|---|
| `VITE_STREAM_API_KEY` | chat and call. This one is spelled STREAM. It must be the same Stream app as the backend key. |
| `VITE_API_BASE_URL_DEV` | `lib/axios.js` when Vite is in development. Fallback `http://localhost:5001/api`. |
| `VITE_API_BASE_URL` | `lib/axios.js` for any other mode. Fallback `/api`. |

## Run locally

Node 18 or newer. MongoDB has to be reachable. Chat and video need a Stream app.

```bash
cd backend
npm install
npm run dev
```

The API listens on `http://localhost:5001`.

```bash
cd frontend
npm install
npm run dev
```

The app is at `http://localhost:5173`.

## Deploy

Production is one origin. Express serves `frontend/dist` when `NODE_ENV` is `production`. The process has to be started with its working directory set to `backend/` (`path.resolve()` is used as the base for `../frontend/dist`).

From the repo root:

```bash
npm run build
```

That installs both packages and builds the frontend. Then, from `backend/`, with `NODE_ENV=production` and the env vars set:

```bash
npm start
```

`npm start` from the repo root runs the backend the same way, but it does not set `NODE_ENV` for you. Without `NODE_ENV=production` the server does not serve the built frontend.

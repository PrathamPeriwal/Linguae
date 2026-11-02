# End-to-end tests

Playwright drives the production build. From this folder:

```bash
npm install
npx playwright install chromium
npm test
```

What the run does:

1. Refuses to start unless `backend/.env` has `MONGO_DB_NAME` ending in `-dev` and a `DEMO_PASSWORD`. Those values are never printed.
2. Builds `frontend/` with `VITE_STREAM_API_KEY` taken from `frontend/.env`.
3. Starts the backend in production on port 5099, with a random JWT secret and `CSP_ENFORCE=true`. Database settings come from `backend/.env`.
4. Seeds that development database with `node scripts/seed-demo.js --apply --confirm=<the dev database name>`.
5. Runs the specs in one Chromium worker, serially. The browser is launched with `--use-fake-ui-for-media-stream` and `--use-fake-device-for-media-stream`.
6. Stops the server and seeds the development database again.

Throwaway accounts use addresses shaped `e2e-<random>-<letter>@example.com`. Do not point `MONGO_DB_NAME` at any other database. Do not edit `.env` files for this suite.

`demo.spec.js` runs first, against the fresh seed. The other specs run after it.

# Package Risk Analyzer — Frontend

The dashboard for [Package Risk Analyzer](../backend/README.md) — a GitHub
App that scores the security risk of npm dependency changes on every push
and pull request. **This README covers the frontend specifically.** For
architecture, the data model, the REST API, GitHub App setup, Docker, and
production deployment, see the [backend README](../backend/README.md) (or
whatever path your checkout of that repository lives at).

## Tech stack

Next.js (App Router), React, TypeScript, Tailwind CSS v4, shadcn/ui,
TanStack Query. Talks to the backend exclusively over its REST API with
credentials included (`fetch(..., { credentials: 'include' })`) — no
secrets, GitHub tokens, or direct database access ever reach this codebase;
`NEXT_PUBLIC_API_URL` is the only environment variable it needs.

## Local development

1. `cp .env.example .env.local` and point `NEXT_PUBLIC_API_URL` at your
   running backend (`http://localhost:3001` for local dev).
2. `npm install`
3. `npm run dev` → `http://localhost:3000`

The backend must already be running (see its README) — this app has nothing
to render without it.

## Pages

`/`, `/login`, `/register`, then behind auth: `/dashboard`, `/repositories`
(+ `/repositories/:id`, `/repositories/:id/analysis/:analysisId`),
`/pull-requests` (+ `/:id`), `/findings` (+ `/:id`), `/packages` (+ `/:id`),
`/settings` (+ `/settings/github`, `/settings/notifications`).

## Testing

```
npm run lint
npm run typecheck
npm run test:e2e
```

**E2E** (`e2e/`, Playwright) drives a real browser against a real running
frontend + backend + database — no mocked API responses. It covers the
account flow (register, duplicate-email and wrong-password errors, logout,
re-login, protected-route access control, theme persistence); the GitHub
OAuth/webhook-driven flows are covered instead by the backend's integration
tests, since those need real GitHub credentials this environment doesn't
have and are more appropriately tested at that layer regardless.

**This platform's frontend image is Alpine-based, and Playwright does not
publish an Alpine-native browser build.** Alpine's own package repo does
have a native Chromium, though (unlike MongoDB on the backend side — see its
README's Known Limitations — this one has a real fix, not just a documented
gap):

```
sudo apk add chromium
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

On a normal glibc dev machine or CI image, omit `PLAYWRIGHT_CHROMIUM_PATH`
entirely and Playwright's own managed browser (installed via
`npx playwright install chromium`) is used.

By default `npm run test:e2e` spawns its own `npm run dev` against
`http://localhost:3000` (see `playwright.config.ts`). Point it at an
already-running frontend instead with `E2E_BASE_URL` — e.g. against this
platform's own dev subdomain reachable from the same host,
`E2E_BASE_URL=http://localhost:3000` if the dev server is already up.
`next dev` compiles each route on its first visit, which can make the very
first run after a fresh dev-server start slower than usual; the suite warms
the routes it needs before the timed tests run to absorb that.

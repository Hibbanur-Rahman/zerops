# Package Risk Analyzer

A GitHub App that watches your repositories' npm dependencies on every push
and pull request, checks changed packages against real security intelligence
(OSV.dev, GitHub Security Advisories, npm registry metadata), scores the risk
of what changed, and reports back where you already work: a PR comment, a
Check Run, and (for anything serious) an email.

This repository is the **backend** — a standalone Express/TypeScript API,
MongoDB/Mongoose data layer, and BullMQ workers. The companion **frontend**
(Next.js dashboard) lives in a separate repository; see [Repository layout](#repository-layout).

## Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Data model](#data-model)
- [REST API](#rest-api)
- [GitHub App setup](#github-app-setup)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Docker](#docker)
- [Testing](#testing)
- [Production deployment](#production-deployment)
- [Security notes](#security-notes)
- [Known limitations](#known-limitations)
- [Future improvements](#future-improvements)
- [Troubleshooting](#troubleshooting)

## Overview

Core flow: a developer pushes a commit or opens a pull request → GitHub
delivers a webhook → the backend verifies its signature, persists it, and
returns immediately → a background worker fetches the changed `package.json`
manifests and lockfiles, diffs them against the previous state, checks every
changed package against real security data sources, scores the risk, and
writes the results to MongoDB → a second worker updates the PR comment and
Check Run, and queues an email for anything above the repository's configured
threshold. The dashboard reads all of this back out over the REST API.

Every step that touches an external system (GitHub, OSV.dev, the npm
registry, Resend) is a real integration — there is no synthetic data or
canned response anywhere in the production code path. Where a provider is
unavailable, the analysis degrades gracefully (see [Known limitations](#known-limitations))
rather than failing or fabricating a result.

## Architecture

```
                     ┌─────────────┐        webhook        ┌──────────────────┐
   GitHub  ────────► │  GitHub App │ ─────────────────────► │  POST /github/webhook │
                     └─────────────┘                        └─────────┬────────┘
                                                                       │ verify signature,
                                                                       │ persist WebhookEvent,
                                                                       │ return 202 immediately
                                                                       ▼
                                                          ┌────────────────────────┐
                                                          │ github-webhook queue   │
                                                          └───────────┬────────────┘
                                                                      ▼
                                          ┌───────────────────────────────────────────┐
                                          │ github-webhook worker                     │
                                          │  push/PR → enqueue dependency-analysis    │
                                          │  installation(_repositories) → Mongo only │
                                          └───────────────────┬───────────────────────┘
                                                               ▼
                                          ┌────────────────────────────────────────────┐
                                          │ dependency-analysis worker                 │
                                          │  fetch manifests/lockfiles (Octokit)       │
                                          │  diff dependency trees                     │
                                          │  query OSV.dev / GHSA / npm registry       │
                                          │  score risk, persist Findings              │
                                          │  enqueue pr-comment + email-notification   │
                                          └──────────────┬──────────────────┬──────────┘
                                                          ▼                  ▼
                                         ┌────────────────────┐   ┌───────────────────────┐
                                         │ pr-comment worker  │   │ email-notification     │
                                         │  update PR comment │   │ worker (Resend)         │
                                         │  create Check Run  │   │                         │
                                         └────────────────────┘   └───────────────────────┘

   Dashboard (frontend) ──── REST API (this repo) ──── MongoDB (source of truth)
                                                 └───── Redis (BullMQ + cache)
```

**Why these decisions** (documented per the "choose the most
production-appropriate solution" brief, where the original spec didn't pin
one down):

- **Separate Express backend, not Next.js API routes.** Required by the
  original spec; also keeps the GitHub App's credentials and all business
  logic fully server-side, with the frontend talking to it only over HTTPS.
- **A dedicated `dependency-analysis` queue, separate from `github-webhook`.**
  Webhook receipt must stay fast (GitHub retries slow webhooks); the actual
  analysis is the slow, retryable part and belongs on its own queue with its
  own concurrency and backoff.
- **Idempotency at the data layer, not just in application logic.** Both
  `WebhookEvent.githubDeliveryId` and `Analysis`'s compound indexes are
  unique at the MongoDB level (see [Data model](#data-model)) — a race
  between two workers can't create a duplicate no matter what the
  application code does.
- **A `SecurityProvider`/`EmailProvider`/`PackageRegistryProvider`
  abstraction layer**, even though only one implementation of each exists
  today. Adding Slack notifications or a second vulnerability source later
  is a new class behind an existing interface, not a rewrite.
- **External managed MongoDB, not a Zerops-provisioned one.** The deployment
  platform this project runs on doesn't offer MongoDB as a managed service;
  Redis is managed by the platform, MongoDB is expected to be an external
  provider (Atlas or similar) via `MONGODB_URI`.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node.js 22, Express 5, TypeScript |
| Database | MongoDB, Mongoose |
| Queues / cache | Redis, BullMQ, ioredis |
| GitHub integration | GitHub App, Octokit, `@octokit/webhooks-methods` |
| Security intelligence | OSV.dev, GitHub Security Advisories (GraphQL), npm registry |
| Email | Resend |
| Validation | Zod |
| Auth | JWT in an httpOnly cookie, bcrypt password hashing |
| Testing | Vitest, Supertest, Playwright (frontend repo) |
| Frontend (separate repo) | Next.js, React, TypeScript, Tailwind, shadcn/ui, TanStack Query |

## Repository layout

```
src/
  app.ts                 Express app factory (no listen -- used directly by tests)
  server.ts               API entrypoint: connects Mongo/Redis, starts inline workers, listens
  worker.ts                Standalone worker-process entrypoint (see Docker/production)
  config/                  env validation, logger, database, redis, GitHub App client
  constants/               enums, risk levels, queue names
  middleware/              auth, validation, error handling, request context
  models/                  Mongoose schemas (see Data model)
  controllers/ routes/ validators/   REST API surface
  services/
    auth.service.ts, authorization.service.ts, auditLog.service.ts
    github/                webhook verification, push/PR event handlers, PR comments, Check Runs
    analysis/                manifest/lockfile parsing, dependency diffing, the analysis pipeline
    security/                CVSS scoring, the SecurityProvider abstraction, OSV/npm/GHSA providers
    risk/                    the risk engine (23-factor scoring) and security-score calculation
    email/                   EmailProvider abstraction, Resend implementation, templates
    cache/                   Redis-backed provider-response caching
  queues/ workers/           BullMQ queue definitions and worker processors
tests/
  unit/                     pure-logic tests (no external services)
  integration/               real MongoDB + real Redis/BullMQ + real HTTP (Supertest) -- see Testing
docker-compose.yml, Dockerfile
```

The frontend repository has an analogous `src/app/`, `src/components/`,
`src/hooks/`, and `e2e/` layout — see its own README for detail.

## Data model

17 Mongoose models. The ones with a non-obvious indexing story:

| Model | Purpose | Key index(es) |
|---|---|---|
| `User` | Account + password hash | unique `email` |
| `GithubAccount` | A user's linked GitHub identity (OAuth) | unique `githubUserId` |
| `GithubInstallation` | A GitHub App installation | unique `installationId` |
| `Repository` | A monitored repo + its `SecurityPolicy` | unique `githubRepositoryId` |
| `WebhookEvent` | Raw inbound webhook + processing status | **unique `githubDeliveryId`** -- the idempotency anchor for the whole webhook pipeline |
| `Analysis` | One push/PR/manual scan | **unique compound** `(repositoryId, commitSha, analysisType)` for push/manual/initial, partial-filtered; **unique compound** `(repositoryId, pullRequestNumber, headSha)` for PR analyses -- these two indexes are what make "never analyze the same commit/PR head twice" a database guarantee, not an application-level check |
| `AnalysisPackage` | One changed package within an analysis | `analysisId` |
| `Dependency` / `DependencyVersion` | npm registry metadata, cached across analyses | unique `(name, ecosystem)` / `(dependencyId, version)` |
| `Finding` | One risk finding (package × analysis), with embedded `RiskFactor[]` and `FindingVulnerability[]` | `(repositoryId, status)`, `analysisId` |
| `Vulnerability` | A known CVE/GHSA/OSV record, cached | unique `(source, sourceId)` |
| `PullRequest` / `Commit` | GitHub PR/commit metadata | unique `(repositoryId, number)` / `(repositoryId, sha)` |
| `Notification` | A sent/failed/skipped email record | `(userId, createdAt)` |
| `NotificationPreference` | Per-user severity/event toggles | unique `userId` |
| `AuditLog` | Append-only action log | `(userId, createdAt)` |

`Repository.policy` (embedded, not a separate collection) holds
`failOnCritical`, `failOnHigh`, `failOnMedium`, `maximumRiskScore`,
`allowNewDependencies`, `allowDeprecatedPackages`, `allowInstallScripts` --
the inputs to the Check Run's pass/fail decision, configurable per repo.

## REST API

All routes are under `/api/v1`. Every response is `{ success: true, data, meta? }`
or `{ success: false, message, errorCode, details? }` -- see
`src/middleware/errorHandler.ts`. Except `register`, `login`, and the GitHub
webhook, every route requires a valid session (the `session` httpOnly
cookie) and only ever returns data the caller owns (see
`authorization.service.ts` -- unauthorized access to another user's resource
is a 404, not a 403, so existence isn't leaked).

| Method & path | Purpose |
|---|---|
| `POST /auth/register`, `/auth/login`, `/auth/logout` | Account + session (rate-limited: 20/15min) |
| `GET /auth/me` | Current session |
| `GET /github/connect` | Redirects into the GitHub OAuth web flow |
| `GET /github/callback` | OAuth callback -- links the GitHub identity |
| `GET /github/install` | Redirects to the GitHub App installation page |
| `GET /github/repositories` | Repos accessible to the user's installations, synced on demand |
| `GET /github/status` | Connection + installation status |
| `POST /github/webhook` | Signature-verified webhook receiver (see [Architecture](#architecture)) |
| `GET /repositories`, `/repositories/:id` | List / detail, with stats |
| `PATCH /repositories/:id` | Toggle monitoring/full-scan, edit the security policy |
| `POST /repositories/:id/scan` | Trigger a manual analysis |
| `GET /analyses`, `/analyses/:id` | List / detail (packages + findings) |
| `GET /findings`, `/findings/:id` | List / detail |
| `PATCH /findings/:id/status` | Mark a finding resolved/ignored |
| `GET /dependencies`, `/dependencies/:id` | Package metadata, across all your repos |
| `GET /pull-requests`, `/pull-requests/:id` | List / detail |
| `GET /notifications` | Sent/failed/skipped email history |
| `GET /notification-preferences`, `PATCH /notification-preferences` | Per-severity/event email toggles |
| `GET /dashboard/overview`, `/dashboard/activity`, `/dashboard/risk-distribution` | Dashboard aggregates |

## GitHub App setup

Create the App at **github.com/settings/apps/new** (or your org's equivalent).
Everything below is a placeholder for wherever you're running this --
substitute your own host, never a hardcoded domain.

1. **Webhook URL**: `https://<your-backend-host>/api/v1/github/webhook`
2. **Webhook secret**: generate one (`openssl rand -hex 32`) and set it as
   `GITHUB_WEBHOOK_SECRET` below -- it must match exactly what you enter here.
3. **Callback URL** (for "Setup URL" / user OAuth): `https://<your-backend-host>/api/v1/github/callback`
4. **Permissions** (repository):
   - **Contents: Read-only** -- fetch `package.json`/lockfiles via `git.getTree`/`repos.getContent`
   - **Pull requests: Read & write** -- read/update the analysis PR comment
   - **Checks: Read & write** -- create/update the "Package Risk Analysis" Check Run
   - **Metadata: Read-only** -- required baseline for every GitHub App
5. **Subscribe to events**: `push`, `pull_request`, `installation`, `installation_repositories`
6. **Generate a private key** (Settings → General → Private keys) and set
   it as `GITHUB_APP_PRIVATE_KEY` (a real PEM block, `\n`-escaped single
   line, or base64 -- all three are accepted, see `src/config/env.ts`).
7. Note the **App ID**, **Client ID**, **Client secret**, and the **App
   slug** (from its settings URL) -- these become `GITHUB_APP_ID`,
   `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_APP_SLUG`.
8. Install the App on the account/repos you want monitored (or let a user do
   this from the dashboard's Settings → GitHub page, which redirects to
   step-6's install URL for you).

## Environment variables

See `.env.example` for the full list with inline comments. Summary:

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | for any DB-backed route | External managed MongoDB (Atlas or similar) -- see [Architecture](#architecture) |
| `REDIS_URL` | yes | BullMQ broker + cache; must run `maxmemory-policy=noeviction` (self-healed at boot) |
| `JWT_SECRET` | yes | ≥16 chars |
| `ENCRYPTION_KEY` | yes | ≥32 chars; encrypts stored GitHub OAuth tokens at rest |
| `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET` | for GitHub features | See [GitHub App setup](#github-app-setup); routes 503 until all are set |
| `RESEND_API_KEY` | for email | Notifications are skipped (not failed) when unset |
| `APP_URL` / `FRONTEND_URL` | yes | Own/frontend origin -- drives CORS and session-cookie `SameSite`/`Secure` |
| `OSV_API_URL`, `NPM_REGISTRY_URL`, `GITHUB_GRAPHQL_URL` | no | Default to the real public endpoints |
| `DISABLE_INLINE_WORKERS` | no | Set on the API process when running a separate worker process/container |

**Never commit a real `.env`.** Never log a GitHub token, private key, OAuth
secret, webhook secret, JWT secret, or email API key -- grep the codebase for
any of these before adding a new log statement near auth/GitHub code.

## Local development

Without Docker:

1. A MongoDB instance reachable via `MONGODB_URI` (Atlas free tier works fine).
2. A local Redis: `redis-server` (or any container/package manager equivalent).
3. `cp .env.example .env` and fill in `JWT_SECRET`/`ENCRYPTION_KEY` at minimum
   (`openssl rand -hex 32` for both). GitHub/Resend vars can stay empty --
   those features degrade to a clean 503/skip rather than crashing.
4. `npm install`
5. `npm run dev` -- starts the API with inline workers (nodemon-style reload via `tsx watch`).
6. In the frontend repository: `cp .env.example .env.local`, `npm install`, `npm run dev`.

To run the worker as its own process instead of inline (matching how
[Docker](#docker) and production run it): set `DISABLE_INLINE_WORKERS=true`
and run `npm run build && npm run start:worker` (or `tsx src/worker.ts` for
a dev-mode equivalent) alongside `npm run dev`.

## Docker

```
docker compose up --build
```

Brings up MongoDB, Redis, the API, a dedicated worker process, and the
frontend. Requires this repository and the frontend repository checked out
as sibling directories named `backend`/`frontend` (see the comment at the
top of `docker-compose.yml` if your layout differs), and a `.env` in this
directory (`cp .env.example .env`, same variables as local dev --
`MONGODB_URI`/`REDIS_URL` are overridden by compose to point at its own
containers, so you don't need real values for those two specifically).

- API: `http://localhost:3001`
- Frontend: `http://localhost:3000`
- MongoDB / Redis are also published on their standard ports for direct inspection.

## Testing

```
npm run lint
npm run typecheck
npm test              # unit + integration, see below
```

**Unit tests** (`tests/unit/`) cover pure logic with no external
dependencies: manifest/lockfile parsing (npm, yarn, pnpm), dependency-tree
diffing, version comparison, CVSS v3.1 scoring (verified against known
reference vectors), the risk engine, security-score calculation,
typosquatting detection, and PR comment rendering.

**Integration tests** (`tests/integration/`) run the real Express app
(Supertest), a real MongoDB, and this project's real Redis, with no mocking
of the systems under test:

- webhook signature verification, persistence, and delivery-ID idempotency
- a real BullMQ worker consuming a real job end-to-end against real Mongo
- the analysis-idempotency guarantees described in [Data model](#data-model)

They need a MongoDB reachable via `TEST_MONGODB_URI` (a **separate**,
disposable database -- never point this at a real one). On a normal glibc
machine or CI image with no `TEST_MONGODB_URI` set, they fall back to
`mongodb-memory-server` automatically. **On this project's Alpine-based
deploy target specifically, `mongodb-memory-server` cannot provision a
database at all** -- there is no official MongoDB build for Alpine -- so an
explicit `TEST_MONGODB_URI` is required there; without one, the integration
suite skips cleanly (unit tests still run) rather than failing.

**Testing the actual GitHub/email flows**: the unit + integration tests
above cover the mechanics (signature verification, idempotency, queueing,
scoring) without needing live credentials. To exercise the *real* end-to-end
flow -- an actual GitHub push updating an actual PR comment and Check Run,
and an actual email arriving -- you need a real GitHub App installed on a
real test repository and a real `RESEND_API_KEY`:

1. Push a commit that changes `package.json` (or open a PR that does) on a
   repository the App is installed on and monitoring is enabled for.
2. Watch `WebhookEvent`/`Analysis` documents appear (`GET /analyses`) and the
   PR comment/Check Run update on GitHub within a few seconds.
3. Set a low `maximumRiskScore` (or add a genuinely vulnerable old package
   version) on the repository's policy to force a HIGH/CRITICAL finding, and
   confirm the email arrives (or check `GET /notifications` for its status,
   including `email_unavailable` if the author has no public email).

**Frontend E2E** (Playwright) lives in the frontend repository (`e2e/`) --
see its README for the Alpine-chromium setup this platform's frontend image
needs, which mirrors the MongoDB caveat above.

## Production deployment

This project is deployed on [Zerops](https://zerops.io) as two independent
services (this API + a frontend service), each with its own `zerops.yaml`
dev/prod build definitions, plus a managed Redis. There is no managed
MongoDB on that platform -- it's wired to an external provider via
`MONGODB_URI` exactly as described in [Architecture](#architecture).

For any other Docker-capable host: build and run this repo's `Dockerfile`
(API) and a second copy of it with `command: node dist/worker.js` (worker),
point both at a real MongoDB and Redis, and put the frontend's `Dockerfile`
behind the same reverse proxy/TLS termination you'd normally use. Set
`NODE_ENV=production`, real secrets, and `DISABLE_INLINE_WORKERS=true` on
the API process (the dedicated worker container handles queue processing).

## Security notes

- Webhook signatures are verified (`X-Hub-Signature-256`) before anything
  else touches the payload; an invalid signature never reaches application code.
- Passwords are bcrypt-hashed (12 rounds); GitHub OAuth tokens are
  AES-256-GCM-encrypted at rest.
- Sessions are a JWT in an httpOnly cookie -- never exposed to frontend JS.
  `SameSite`/`Secure` are derived from `APP_URL`'s scheme (see `auth.service.ts`).
- `helmet`, CORS locked to `FRONTEND_URL`, and rate limiting (600/15min
  general, 20/15min on auth) are applied globally.
- All input is Zod-validated at the route boundary.
- Cross-user access to another owner's repository/analysis/finding is a 404,
  not a 403 (existence isn't leaked) -- see `authorization.service.ts`.
- Errors never leak stack traces in production (`NODE_ENV=production`); see
  `middleware/errorHandler.ts`.
- Secrets are never logged -- grep for `GITHUB_APP_PRIVATE_KEY`,
  `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`, `JWT_SECRET`,
  `ENCRYPTION_KEY`, `RESEND_API_KEY` before adding any new log statement near
  the code that touches them.

## Known limitations

- **No managed MongoDB on the deploy platform** — requires an external
  provider; see [Architecture](#architecture).
- **`mongodb-memory-server` doesn't work on this platform's Alpine image**
  (no official MongoDB build for Alpine) — integration tests need an
  explicit `TEST_MONGODB_URI` there; see [Testing](#testing).
- **Playwright has no Alpine-native browser build** — the frontend's E2E
  suite needs the distro's own `chromium` package instead of Playwright's
  managed download; see the frontend README.
- **Risk factors requiring data this project has no honest source for are
  not implemented as heuristics that would fabricate a signal.** Specifically
  *not* implemented: malicious-package indicators, dependency-confusion
  detection, unexpected-binary detection, and known-malware matching — none
  of OSV.dev, GHSA, or npm registry metadata provide this data, and
  guessing would violate this project's own "never fabricate a finding"
  rule. What *is* implemented, with real signals: known vulnerabilities +
  CVSS, install-script risk heuristics (including cryptomining keyword
  matching), package age, maintenance/deprecation status, maintainer-count
  changes, typosquatting (Levenshtein distance against popular package
  names), and version-change-direction risk.
- **Email delivery to a commit author is best-effort.** If GitHub doesn't
  expose a public email for the author, the notification is recorded as
  `email_unavailable` rather than failing the analysis (per spec).
- **No email-verification step on registration.** Registering an account
  logs the user in immediately; this was a deliberate scope decision given
  the size of the rest of the spec, not an oversight.

## Future improvements

The provider abstractions (`SecurityProvider`, `EmailProvider`,
`PackageRegistryProvider`) exist specifically so these can be added without
touching the analysis pipeline itself:

- Additional notification channels: Slack, Microsoft Teams, GitHub Issues
- Automatic dependency-upgrade PRs for findings with a known patched version
- AI-generated plain-language explanations of a finding
- Organization-level dashboards (currently per-user)
- SSO
- Other package ecosystems (this project is npm-only; `ECOSYSTEMS` in
  `src/constants/enums.ts` is where a second one would start)
- Container image scanning

## Troubleshooting

- **"The GitHub App is not configured yet" (503)**: one of the five
  `GITHUB_*` variables is unset -- `env.github.configured` requires all of
  them together. Check `GET /github/status`.
- **Webhook returns 401**: `GITHUB_WEBHOOK_SECRET` doesn't match what's
  configured on the GitHub App, or the request body was mutated in transit
  (a proxy re-encoding it, for example) — signature verification is over
  the exact raw bytes GitHub signed.
- **A push doesn't trigger an analysis**: confirm the repository has
  `monitoringEnabled: true`, and that the push actually touched a dependency
  file (`package.json`, `package-lock.json`, `npm-shrinkwrap.json`,
  `yarn.lock`, `pnpm-lock.yaml`) — pushes that don't are intentionally
  skipped unless `fullScanEnabled` is set.
- **BullMQ jobs failing with a Mongoose "buffering timed out" error**:
  usually a stale worker process from an earlier run still attached to the
  same Redis with no live MongoDB connection — check for orphaned `node
  dist/worker.js` / `tsx watch src/server.ts` processes competing for the
  same queue.
- **Email always shows `skipped`**: `RESEND_API_KEY` is unset — this is
  intentional graceful degradation, not a bug.

# Budget Tracker Workspace — AI Coding Guidelines

> Rules for every AI assistant working on this monorepo. Read them **before writing a single line of code**.

---

## ⚠️ Critical Environment Notice
- **Next.js version is controlled** (currently 16.x). Read the versioned docs at
  `apps/web/node_modules/next/dist/docs/` before writing any Next-specific code — Next 16 removed sync
  `params`/`searchParams` and defaults to Turbopack.
- **Architecture:** Read `overview.md` for a crisp map of apps/packages before starting.

---

## 1. DRY — Don't Repeat Yourself

1. **Search before implementing.** Check `packages/utils/src/` (types, zod schemas, month helpers, variance math,
   report aggregation) — the variance and report logic is meant to live **only** there.
2. If a module exists, extend it; don't build an inline variant.
3. Shared domain logic goes into `packages/utils` **from the start** — never inline it with "I'll refactor later".

## 2. KISS — Keep It Simple, Stupid

- Prefer the simplest correct solution. No abstraction without ≥2 concrete uses.
- Routes stay thin: validate with zod → enforce the lock → call Prisma → serialize DTOs.
- Pure functions (variance, aggregation, lock checks) go in `packages/utils` or `backend/src/lib` and are never
  coupled to the HTTP layer.

## 3. Product rules (must never regress)

- **Locking is server-side:** plans/actuals writes for locked months return `423 Locked`. Never rely on the UI.
- **Variance math:** `variance = actual − plan`; `variancePct = null` when plan is 0 or missing (never NaN).
- **Missing actual = 0** for math everywhere; UI shows `(no entry)`.
- Changes to these rules require updating the tests in `apps/backend/tests/` **and** the README decisions table.

## 4. Modification checklist

- [ ] Searched `packages/utils` for existing helpers/types/schemas
- [ ] No duplicated styles or logic across `apps/web` and `apps/backend`
- [ ] New shared types/zod schemas exported from `packages/utils/src/index.ts`
- [ ] Props/interfaces typed; comments preserved; no debug code (`console.log`, stray prints)
- [ ] `bun test` (backend) and `bun run typecheck` (backend + web) pass; web builds with `next build`

## 5. Backend specifics

- Worker env is typed in `backend/src/types/hono.ts` (`HonoEnv`) — new secrets must be added there AND to
  `.dev.vars.example`, `wrangler.jsonc`-level config, and `BUILD_DEPLOY.md`.
- Prisma is created **per request** via `getPrisma(env.DATABASE_URL)` (pg driver adapter) — do not hoist a global
  client into durable storage.
- Error responses: `{ error: string, details?: ... }` with honest status codes (400 validation, 401 auth,
  404 ownership, 409 conflict, 423 locked, 500 server).
- CSV import must validate month format and category existence, and report line-level errors.

## 6. Frontend specifics

- All stateful pages are client components (`"use client"`); data via `@tanstack/react-query`
  (`src/lib/providers.tsx`).
- Fetching goes through `src/lib/api.ts` (token injection + typed endpoints) — never raw `fetch` in pages.
- Auth state lives in `src/lib/auth.tsx` (`useAuth`); token in `localStorage` under `pt_token`.
- Reports/drill-down reuse `@tracker/utils` formatting; amounts are displayed with 2 decimals.

## 7. Deployment

- Backend ships via **wrangler deploy** to Cloudflare; frontend via Vercel (root directory `apps/web`).
- Secrets: `npx wrangler secret put DATABASE_URL|DIRECT_URL|JWT_SECRET` — never commit them.
- Full steps live in `BUILD_DEPLOY.md` — update it when the environment changes.
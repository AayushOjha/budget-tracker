# Budget Tracker Workspace Overview

A monorepo powering a **plan vs actual spending tracker** (see `README.md` for the full product brief and
decisions). Two deployable apps plus one shared package.

## Apps

### 1. `backend` (`@tracker/backend`) — Cloudflare Workers
- **Functionality:** REST API for auth, categories, monthly plans, actual spend (incl. CSV import), month locking,
  and the plan-vs-actual report.
- **Key modules:** Hono, Prisma via `@prisma/adapter-pg` + `pg` (PostgreSQL on Supabase), `bcryptjs` + `jose`
  (JWT auth). Unit tests run with `bun test`.

### 2. `web` (`@tracker/web`) — Vercel
- **Functionality:** Next.js (App Router) client app: report dashboard (table + chart + drill-down + CSV export),
  targets editor, spend logging + CSV import, month locking, category management.
- **Key modules:** Next 16, `@tanstack/react-query`, `recharts`.

## Shared Package

### 3. `packages/utils` (`@tracker/utils`)
- **Functionality:** single source of truth for domain logic: types/DTOs, zod schemas, month helpers,
  `computeVariance` (edge cases for plan = 0), `buildReport` (category × month aggregation + totals).
- **Usage:** imported by the backend (report generation, validation) and the web app (types, formatting,
  chart inputs). Tests for these live in `apps/backend/tests/` and run via `bun test` at the root
  (`bun run test`).

## Conventions
- Bun workspaces: `apps/*`, `packages/*`; package manager lockfile: `bun.lock`.
- Backend secrets: Cloudflare Worker secrets (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`) + `.dev.vars` locally.
- Frontend API base: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8787`).
- Full build/deploy: `BUILD_DEPLOY.md`; AI assistant rules: `AGENTS.md`.
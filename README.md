# Plan vs Actual Tracker — Take-Home Assignment

A full-stack web app where users set **monthly spending targets per category**, log **actual spend**, and view a
**plan vs actual report with variance** — including support for **locked periods**.

- **Frontend:** Next.js 16 (App Router) — deployed on **Vercel**
- **Backend:** Hono on **Cloudflare Workers** (serverless), PostgreSQL via **Supabase**, **Prisma** ORM
- **Tooling:** Bun workspaces monorepo (`apps/*`, `packages/*`)

---

## Live URL

- Web app: **`https://budget-tracker-e2sp2n6s5-ayush-ojhas-projects-b29574ad.vercel.app/login`**
- Backend API: **`https://budget-tracker-backend.dev-ayush.workers.dev`**
- Demo login: `demo@example.com` / `demo1234` (created by `db:seed`, matches the assignment's sample data)

---

## Repository layout

```
apps/
  backend/   Hono API (Cloudflare Workers) + Prisma schema, migrations, seed, tests
  web/       Next.js app (Vercel)
packages/
  utils/     Shared types, zod schemas, month helpers, variance math, report aggregation
```

Shared business logic (variance math, report aggregation, validation) lives in `packages/utils` and is unit-tested
once, then used by both the API and the web app — no duplicated formulas.

---

## Prerequisites

1. **Bun** ≥ 1.1 — [bun.sh](https://bun.sh) (the lockfile is `bun.lock`)
2. A **Supabase** project (Postgres). Grab:
   - `DATABASE_URL` — pooled connection (port **6543**, pgbouncer) from *Connection pooling*
   - `DIRECT_URL` — direct connection (port **5432**) from *Session mode*
3. A **Cloudflare** account (`npx wrangler login`) and a **Vercel** account

## Step-by-step setup

```bash
# 1. Install workspace deps
bun install

# 2. Backend environment (never commit real values)
cp apps/backend/.dev.vars.example apps/backend/.dev.vars
#   -> fill in DATABASE_URL (pooled), DIRECT_URL (direct), JWT_SECRET

# 3. Create schema + seed sample data (demo user, Marketing/Payroll/Tools, Jan-Feb 2026 figures)
cd apps/backend
bun run db:migrate   # or: bun run db:push (fast iteration)
bun run db:seed

# 4. Run the API locally (http://localhost:8787)
bun run dev

# 5. Frontend env + dev server
cd apps/web
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8787
bun run dev                  # http://localhost:3000
```

### Tests

```bash
bun test                 # backend: aggregation, variance math, lock enforcement, month helpers
bun run typecheck        # backend + web
```

---

## Documented product decisions

### Variance math

- `Variance = Actual − Plan` (negative = under plan, rendered green; positive = over plan, red).
- `Variance % = (Actual − Plan) / Plan × 100`.
- **Plan = 0:** variance = `actual − 0 = actual`; variance % is **null** and always rendered as `—`/`N/A` —
  never `NaN`, `Infinity`, or a `0/0` crash. A plan of `0` is treated exactly like "no target" for the percentage,
  and a row with **no plan at all** displays `—` for Variance and Variance %.
- **Missing actual:** treated as **0** for all math (`variance = −plan`, variance % = −100% when plan exists)
  and the Actual column shows `0.00` with a small `(no entry)` marker, so a "0" is clearly distinguishable from a
  deliberately logged zero. This is the choice documented in the assignment ("treat missing actual as 0. Be
  consistent.") — it keeps charts and totals fully consistent.

### Locking

- **Granularity: MONTH.** Locking `2026-01` makes all plans and actuals for that month read-only. A quarter is
  locked by locking its three months (the Locking page documents this).
- **API enforced, not just UI:** every plan/actual write checks the lock table server-side and returns
  **`423 Locked`** with a clear message (`"Period is locked and read-only: 2026-01"`). CSV import rejects locked
  rows per-line. Locked months still appear in reports.
- Unlocking is intentionally supported (a `locks` table with `(user_id, month)` unique rows).

### Report & drill-down

- `GET /api/report?start=YYYY-MM&end=YYYY-MM` returns one row per (category × month) plus per-month totals.
  The same pure function `buildReport()` powers the API and the tests.
- Charts: monthly **net variance** (actual − plan summed across categories) bar chart over the selected range.
- **Stretch goal — drill-down:** click any category row in the report table to see the underlying actual entries.

### CSV import (stretch goal)

- Format: `month,category,amount` (optionally with a `month,category,amount` header; amounts may include `$` and
  commas). Validated per line: month must be `YYYY-MM`, amount must be a positive number, category must exist
  (case-insensitive). Locked months are rejected with a per-line error. Returns `{ imported, skipped, errors[] }`.

### Other stretch goals

- **Export:** the report page downloads a CSV of the current range.
- **Fiscal year** deferred — the range picker supports any range, and the `Year to date` shortcut covers the
  calendar-year default mentioned in the brief.

## Assumptions & tradeoffs

| Area | Choice | Why |
|---|---|---|
| Money | stored & computed as `Float` (dollars) | Matches the salon app's price handling; fine for a take-home. In production i'd use integer **minor units (cents)** or `Decimal` to avoid float drift. |
| Categories | per-user, create + list only | Meets the "seed list + assignment" requirement; deletion is deliberately omitted because it would cascade-delete plans/actuals. |
| Auth | email + password, bcrypt, HS256 JWT (30d) | Required by the brief; stored in `localStorage` (documented tradeoff — risky in hostile environments; secure cookies would be better in production). |
| Actuals | multiple entries per (category, month) allowed | Matches the `Actual` model: several spend entries can be logged; the report sums them. |
| Locking | month granularity | Documented on the Locks page and here. |
| Zeitgeist | `NEXT_PUBLIC_API_URL` points at the worker | Workers `PORT` is arbitrary; CORS is open (`origin: "*"`, bearer tokens only, no cookies). |

## Scaling notes (asked for in the brief)

The schema already carries the indexes a report needs: `plans(user_id, month)` and `actuals(user_id, month)`,
unique `plans(user_id, category_id, month)`, plus `locks(user_id, month)`.

- At larger span, `plans`/`actuals` are immutable-ish time series: a natural next step is **partitioning by month**
  (or by year) in Postgres so report scans touch only the queried partitions.
- The report endpoint materializes `category × month` rows on the fly — with the indexed tenant columns, a year
  × ~50 categories is a couple of hundred rows; trivially fast. If it ever isn't, pre-aggregate into a
  `monthly_summary` table or a Postgres view.
- All queries filter by `user_id` first (data-isolation by construction, no cross-user leakage).

## What I'd improve before production

- Integer cents / `Decimal` money columns + a ledger of money movements for auditability.
- Secure, httpOnly cookie sessions + CSRF protection; rate limiting on auth routes.
- Row-level pagination and cursor pagination on actuals; a shared zod row validator between CSV import and manual
  input already exists.
- CI pipeline: `bun install → typecheck → test → wrangler deploy → vercel build`, plus migrations as a
  stepwise, reversible workflow (currently `prisma migrate dev` is manual).
- Lock as a **quarter factory** (`Q1 2026` maps to 3 months) or ranges with overlap validation if real users
  request bigger locking granularity.
- Observability: structured logs, request IDs, and prefailure D1/workers metrics.
- i18n + CSV column validation with localization later.

## Deployment

See [BUILD_DEPLOY.md](./BUILD_DEPLOY.md) for the full guide (Cloudflare secrets, wrangler deploy, Vercel setup,
rollbacks).

## Security note

Real credentials are never committed: `.env`, `.dev.vars` and `.env*.local` are gitignored; only `.example`
files are shipping. Verify the git-ignored files after cloning.
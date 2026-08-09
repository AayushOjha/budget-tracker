# Build & Deploy Guide — Budget Tracker

> Backend: **budget-tracker-backend** — Hono + Prisma + Cloudflare Workers
> Frontend: **@tracker/web** — Next.js on Vercel (root directory `apps/web`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime (API) | Cloudflare Workers (Hono) |
| ORM | Prisma 5 with `@prisma/adapter-pg` (pg driver adapter) |
| Database | PostgreSQL on Supabase |
| Auth | email + password (bcryptjs) + HS256 JWT (jose) |
| Frontend | Next.js 16 (App Router), React Query, recharts |
| Package manager | Bun (workspaces) |

---

## Prerequisites

1. **Bun** — [bun.sh](https://bun.sh)
2. **Wrangler** — included as a devDependency in `apps/backend`
3. **Cloudflare account** — `cd apps/backend && npx wrangler login` (verify: `npx wrangler whoami`)
4. **Supabase project** — database credentials from Dashboard → Project Settings → Database:
   - **Connection pooling** → `DATABASE_URL` (port `6543`)
   - **Session mode / direct** → `DIRECT_URL` (port `5432`)

---

## Local development

```bash
bun install                          # workspace root
cp apps/backend/.dev.vars.example apps/backend/.dev.vars   # fill real values
cd apps/backend
bun run dev                          # http://localhost:8787 (wrangler dev)

cd apps/web
cp .env.example .env.local           # NEXT_PUBLIC_API_URL=http://localhost:8787
bun run dev                          # http://localhost:3000
```

## Database operations (from `apps/backend`)

```bash
bun run db:generate     # regenerate Prisma client after schema changes
bun run db:migrate      # create + apply a migration (dev)
bun run db:push         # fast schema sync without migration files (dev only)
bun run db:seed         # demo user + sample data (demo@example.com / demo1234)
bun run db:studio       # inspect data
```

> `prisma migrate dev` uses `DIRECT_URL`; the Worker runtime uses `DATABASE_URL` (pooled). Both come from
> secrets/env files — never commit them.

## Backend deployment (Cloudflare Workers)

```bash
cd apps/backend

# 1. Dry-run to validate the bundle (expect ~2.9 MB upload / ~990 KB gzip)
bun run deploy:dry

# 2. Set secrets (one-time per environment; re-run when rotating)
npx wrangler secret put DATABASE_URL     # pooled connection string
npx wrangler secret put DIRECT_URL       # direct connection string
npx wrangler secret put JWT_SECRET       # e.g. openssl rand -base64 48

# 3. Deploy
bun run deploy
# -> https://budget-tracker-backend.<your-subdomain>.workers.dev

# 4. Verify
curl https://budget-tracker-backend.<your-subdomain>.workers.dev/ping   # pong!
```

Rollback / history:

```bash
npx wrangler deployments list
npx wrangler rollback <version-id>
```

## Frontend deployment (Vercel)

1. Import the repo into Vercel (Git integration or CLI).
2. **Root Directory:** `apps/web` — Vercel auto-detects the framework (Next.js).
3. **Framework Preset:** Next.js; **Install Command:** `bun install`; **Build Command:** `bun run build`.
4. **Environment Variables** (Settings → Environment Variables):
   - `NEXT_PUBLIC_API_URL` → the deployed worker URL, e.g. `https://budget-tracker-backend.<subdomain>.workers.dev`
   - `NEXT_PUBLIC_APP_URL` → the Vercel domain
5. Deploy. `bun.lock` is at the workspace root; Vercel resolves workspace deps from there.

CLI alternative:

```bash
bunx vercel --cwd apps/web --prod
```

> CORS is open on the Worker (`origin: "*"`, bearer tokens only) so any Vercel domain works without config.

## CI checklist (manual for now)

```bash
bun install
bun run test              # backend unit tests (variance, aggregation, locks, months)
bun run typecheck         # backend + web
bun run --cwd apps/web lint
bun run --cwd apps/web build
bun run --cwd apps/backend deploy:dry
```

## Troubleshooting

| Issue | Fix |
|---|---|
| `DATABASE_URL` missing at runtime | `npx wrangler secret put DATABASE_URL` |
| Prisma types stale after schema change | `bun run db:generate` |
| `db push` fails on unique constraint | duplicate category rows — dedupe in DB |
| Worker bundle too large | default `prisma-client-js` output is fine (~1 MB gzip); avoid adding heavy deps to the worker |
| CORS errors | check `cors()` middleware in `apps/backend/src/index.ts` |
| Web can't reach API | verify `NEXT_PUBLIC_API_URL` (no trailing slash) and re-deploy |
| `prisma migrate` needs `directUrl` | `DIRECT_URL` must be the non-pooled 5432 URL |

## Quick reference

```bash
cd apps/backend
bun run db:generate && bun run dev   # iterate on API
bun run deploy                        # ship backend
cd apps/web && bun run dev            # iterate on frontend
```

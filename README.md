# CoachOS

One place for a coach or consultant to run their whole practice: clients, sessions, notes,
scheduling, payments and feedback — connected around the client relationship.

The full product and technical brief lives in [`SPEC.md`](./SPEC.md). Decisions made while
building are logged in [`DECISIONS.md`](./DECISIONS.md).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions, Turbopack) |
| UI | React 19, Tailwind CSS v4 (CSS-first, OKLCH), shadcn/ui, lucide-react |
| Database | Supabase Postgres, Drizzle ORM + drizzle-kit migrations |
| Auth | Supabase Auth (email/password + Google), session refresh in `proxy.ts` |
| Tenancy | `workspace_id` on every row, enforced in `lib/db/queries/*`, plus Postgres RLS |
| Validation | zod at every input boundary |

Requires **Node.js 20+** (developed on 24).

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill it in — see below
npm run db:migrate           # apply the schema to your Supabase Postgres
npm run dev                  # http://localhost:3000
```

### Environment

Copy `.env.example` to `.env.local`. For local development you only need the Supabase block —
integration keys can be added as you connect each service.

| Variable | Where to find it | Needed for |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally | OAuth redirects, absolute URLs |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (URI) | Drizzle queries + migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Auth (browser + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Auth (browser + server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | Webhooks and admin-side writes |

> `DATABASE_URL`: use the **session pooler** string for the app and the **direct connection**
> string for migrations if your network blocks port 5432. `prepare: false` is already set for
> pooler compatibility.

### Google sign-in

1. Supabase → Authentication → Providers → Google → enable.
2. Paste the Google OAuth client ID and secret.
3. Add `${NEXT_PUBLIC_APP_URL}/auth/callback` to the provider's redirect URLs, and the same
   under Supabase → Authentication → URL Configuration → Redirect URLs.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration from `lib/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Drizzle Studio |

Run `typecheck`, `lint` and `build` before committing.

## Project structure

```
app/
  (marketing)/          public landing
  (auth)/               sign-in, sign-up, onboarding
  (app)/                the authenticated coach workspace
  auth/callback/        OAuth + email confirmation landing
components/
  ui/                   shadcn primitives
  layout/               app shell, sidebar, command palette
lib/
  auth/                 workspace + user resolution per request
  config/               workspace_config zod schemas, terminology, navigation
  db/
    schema.ts           Drizzle schema
    queries/            workspace-scoped data access — every function takes workspaceId first
    migrations/         generated + hand-written SQL (RLS policies)
  supabase/             browser / server / session clients
proxy.ts                session refresh + route gating (Next 16's middleware)
```

## Rules that hold everywhere

1. **Every query is workspace-scoped.** Functions in `lib/db/queries/*` take `workspaceId` as their
   first argument, and no feature builds a query inline. A missing `workspace_id` filter is a bug.
2. **No hardcoded nouns.** Client/session/program labels come from `workspace_config.terminology`
   via the `t` formatter on the workspace context.
3. **Providers, not SDKs.** Calendar, video, payments, email and scheduling go through the adapter
   interfaces in `lib/integrations/` so a coach can bring their own tool or use ours.
4. **zod at every boundary** — forms, server actions, route handlers, webhooks.

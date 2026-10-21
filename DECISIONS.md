# DECISIONS

Running log of choices made while building CoachOS. Newest at the bottom of each phase.

---

## Phase 0 — Foundation

### D-001 — Repo root is `coachos/`, not the parent folder
`create-next-app` rejects the parent directory name (`Coach OS - Dipti`) because npm package names
cannot contain spaces or capitals. Rather than move `node_modules` after the fact, the Next.js app
was scaffolded into `coachos/` and that directory is the repo root (matching Section 12 of `SPEC.md`).
`SPEC.md` lives inside it.

### D-002 — Pinned versions
Scaffolded with the current stable releases as of August 2026: Next.js 16.3.1, React 19.2.8,
Tailwind CSS v4 (CSS-first, no `tailwind.config.js`), TypeScript 5. Node 24 local, Node 20+ required.

### D-003 — Postgres driver: `postgres` (postgres.js), not `pg`
Drizzle's recommended driver for Supabase. Serverless-friendly, no native build step, and works with
both the pooled (`?pgbouncer=true`) and direct connection strings Supabase issues. Migrations run
against the direct connection; the app uses the pooled one.

### D-004 — `proxy.ts`, not `middleware.ts`
Next.js 16 deprecated the `middleware` file convention and renamed it to `proxy` (same semantics,
same `config.matcher`). Session refresh + route gating live in `proxy.ts` at the repo root, with the
Supabase logic in `lib/supabase/session.ts`.

### D-005 — shadcn/ui on Base UI: `render`, not `asChild`
The current shadcn default style (`base-nova`) is built on **Base UI**, not Radix. Composition uses
a `render` prop taking an element (`<Button render={<Link href="/x" />}>Label</Button>`) instead of
Radix's `asChild` + single-child pattern. Children stay on the outer component. Any snippet copied
from older shadcn/Radix docs needs converting.

### D-006 — RLS is written as raw SQL alongside Drizzle migrations
Drizzle generates the DDL; row-level-security policies live in hand-written migration files under
`lib/db/migrations/`. RLS is defence-in-depth only — **application-layer `workspace_id` scoping in
`lib/db/queries/*` is the primary guarantee**, per spec rule 3.

---

## Phase 1

### D-007 — Connect through the Supabase pooler, never the direct host
Supabase's direct database host (`db.<ref>.supabase.co`) publishes **only an AAAA record** — it is
IPv6-only. Vercel's serverless functions are IPv4-only, so every query from production failed while
the same URL worked from a developer machine with IPv6. The failure surfaced as a generic
"Something went wrong" error boundary, because Next.js strips error detail from client boundaries in
production.

Use the pooler, which resolves to IPv4:

| Where | Port | Mode | Why |
|---|---|---|---|
| Vercel | 6543 | transaction | Each function invocation is short-lived; transaction mode does not hold a backend between statements |
| Local dev + `db:migrate` | 5432 | session | Session mode supports the advisory locks and DDL that drizzle-kit needs |

`prepare: false` is already set in `lib/db/index.ts`, which both pooler modes require.

The pooler hostname is region-specific (`aws-0-<region>.pooler.supabase.com`) and the username is
`postgres.<project-ref>`. Copy the exact string from the dashboard's **Connect** button rather than
assembling it by hand.

### D-008 — Owner deletion cascades
See the `0002_owner_delete_cascade` migration. Deleting a coach's auth user deletes their workspace
and everything in it. Phase 3 must require ownership transfer before an owner can be removed from a
shared workspace.

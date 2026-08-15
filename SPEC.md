# CoachOS — Build Specification

> Paste this whole file into Claude Code as the project brief. It is written to be read top-to-bottom by an AI coding agent. Section 1 tells you how to work; sections 2–14 are the product and technical spec. Build in the phase order defined in Section 13 — do **not** attempt to build everything at once.

---

## 1. Instructions for the coding agent

You are building **CoachOS**, a one-stop platform for coaches and consultants. Follow these rules for the whole project:

1. **Work phase by phase.** Section 13 defines phases. Complete and verify Phase 0 and Phase 1 (the MVP) before touching later phases. Do not scaffold modules that belong to a later phase.
2. **Ask before assuming** on anything that affects data model, billing, or auth. Everywhere else, make a sensible choice and note it in a `DECISIONS.md` file at the repo root.
3. **Every feature is multi-tenant.** Every table that holds coach data has a `workspace_id`. Every query is scoped to the current workspace. There are no exceptions — treat a missing `workspace_id` filter as a bug.
4. **Type-safety end to end.** TypeScript strict mode, `zod` for every input boundary (forms, API, server actions), inferred types from the DB schema. No `any`.
5. **Config-driven UI.** The interface adapts per coach based on a `workspace_config` record (see Section 6). Do not hardcode "client" — read the tenant's terminology and enabled modules from config.
6. **Provider abstraction for integrations.** Calendar, payments, video, email, and scheduling each go through a provider interface (Section 5). A coach either connects their own tool ("bring your own") or uses our native provider. Never call a vendor SDK directly from a feature — always through the adapter.
7. **Keep a running `DECISIONS.md` and update `README.md`** setup steps as you add services.
8. **Write it to ship.** Real error states, loading states, empty states, and mobile-responsive layouts from the start — not "TODO polish later".
9. **Commit in small, working increments** with clear messages. After each feature, run typecheck, lint, and build before moving on.

When you start, first output a short plan for Phase 0 + Phase 1 and the folder structure you intend to create, then begin.

---

## 2. Product vision

**The problem.** Coaches and consultants run their business across a mess of disconnected tools — Calendly for booking, Google Calendar for scheduling, Zoom for calls, Stripe for payments, Notion or a spreadsheet for client notes, Google Forms for feedback, email for everything else. Nothing talks to each other. Context is scattered. There is no single view of a client relationship.

**The product.** CoachOS is the single place where a coach runs their entire practice: clients, sessions, notes, scheduling, payments, feedback, programs, and communication — all connected around the client relationship, not a sales pipeline.

**The core bet — "bring your own, or use ours".** CoachOS does not force coaches to abandon the tools they like. For each capability (calendar, video, payments, scheduling, email), a coach can either **connect their existing tool** or **use the native CoachOS version**. Either way, the data lands in one unified timeline. This removes the #1 reason coaches don't switch tools: migration pain.

**Adaptive, not one-size-fits-all.** There are many kinds of coaches — life, business, executive, health/fitness, career, relationship, financial, spiritual, academic. During onboarding we learn the coach's type, what they sell, and how they work, then **customize the platform's modules, default views, and terminology** to fit them. A fitness coach sees "clients" and "programs"; a consultant sees "accounts" and "engagements"; a tutor sees "students" and "courses" — same engine, different skin.

**The differentiator — AI-native.** Session transcripts become notes and action items automatically. Follow-ups are drafted for the coach. Every session starts with an AI-generated prep brief. Feedback is summarized and trend-tracked. This is the moat: incumbents (Paperbell, CoachAccountable, Practice, Simply.Coach) were built before this was possible.

---

## 3. Target users and archetypes

Primary user = the coach/consultant (the tenant owner). Secondary user = the coach's client (uses the client portal).

Support these archetypes via config (Section 6), not separate codebases:

| Archetype | Terminology | Emphasized modules |
|---|---|---|
| Life / mindset coach | client, session | Sessions, goals, feedback, journaling |
| Business / startup consultant | account, engagement | Programs, documents, invoicing, deliverables |
| Executive coach | client, engagement | 360 feedback, goals, confidential notes |
| Health / fitness coach | client, program | Programs, check-ins, progress metrics, habits |
| Career coach | client, session | Sessions, documents, action items |
| Tutor / academic coach | student, course | Courses, scheduling, progress, materials |
| Financial coach | client, plan | Documents, milestones, recurring reviews |
| Group / cohort coach | member, cohort | Group sessions, shared resources, cohort feedback |

---

## 4. Feature specification (by module)

Each module is tagged with the phase it belongs to. **[MVP]** = Phase 1.

### 4.1 Clients / contacts **[MVP]**
- Central client record: profile, contact info, avatar, timezone, tags, custom fields.
- Lifecycle status: lead → active → paused → completed → churned.
- Unified **timeline**: every session, payment, note, form response, and message in chronological order.
- Intake form on signup/onboarding of a client; responses stored against the client.
- Client search, filter by status/tag, list + detail views.

### 4.2 Sessions **[MVP]**
- Session record: date/time, duration, type, status (scheduled / completed / no-show / cancelled).
- **Private coach notes** and **shared notes** (visible to client in portal).
- Agenda, action items / homework (with due dates and done state).
- Attachments and, later, recording + transcript.
- Recurring sessions.
- Link a session to a program/package so completing it decrements sessions remaining.

### 4.3 Scheduling and bookings **[MVP]**
- Availability rules per coach (working hours, buffers, min notice, max per day).
- Public **booking page** (our Calendly replacement) with timezone handling.
- Reschedule / cancel flows with automated email reminders.
- **Two-way calendar sync** (native provider = Google Calendar in MVP; more via adapter later).
- Auto-generate a video link on booking (native = Daily.co; or the coach's Zoom/Meet).

### 4.4 Payments and billing **[MVP for basic]**
- One-off payments via hosted payment link (MVP).
- **Stripe Connect** so each coach connects their own Stripe and gets paid directly (the platform is not the merchant of record).
- Later: packages, subscriptions/retainers, invoices, refunds, outstanding balances, revenue reporting.
- India option: Razorpay adapter (Phase 3).

### 4.5 Programs and packages *(Phase 2)*
- Package definition (name, session count, price, validity).
- Enrollment = a client's purchased instance; tracks sessions used / remaining.
- Program templates with milestones/curriculum; assign to clients.

### 4.6 Feedback and progress *(Phase 2)*
- Post-session feedback forms and periodic surveys (ratings + open text).
- Goal tracking with milestones; client-reported metrics (e.g. weight, revenue, mood).
- Wins log. Trend charts over time.

### 4.7 Client portal *(Phase 2)*
- Client-facing app: book sessions, view shared notes + homework, pay invoices, access resources, message the coach.
- Per-workspace branding.

### 4.8 Communication *(Phase 2)*
- Email logging + templates; in-app messaging with clients.
- Automated reminders, follow-ups, no-show handling, renewal nudges.

### 4.9 Documents and resources *(Phase 2)*
- Contracts + e-signature, resource library, file sharing per client or workspace.

### 4.10 Dashboard and analytics **[MVP for basic]**
- MVP: today's sessions, active client count, revenue this month, quick actions.
- Later: completion rate, churn, utilization, revenue trends.

### 4.11 Automations *(Phase 3)*
- Rule builder: triggers (session booked, no-show, package ending, feedback received) → actions (email, task, nudge).

### 4.12 AI layer *(Phase 3, with hooks reserved from MVP)*
- Transcript → auto session notes + summary + action items.
- AI-drafted follow-up emails.
- Pre-session **prep brief** (recap of last session, open action items, goals).
- Feedback sentiment + progress report generation.
- Reserve a `Note.ai_generated` flag and an `ai_jobs` table from the start so this slots in cleanly.

### 4.13 Settings *(MVP: essentials)*
- Workspace profile + branding, terminology config, module toggles, integration connections, team members (Phase 3).

---

## 5. Integration architecture — "bring your own, or use ours"

This is the heart of the product. Model each **capability** as an interface with swappable **providers**.

Capabilities: `calendar`, `scheduling`, `video`, `payments`, `email`, `transcription`, `storage`.

For each capability a workspace has an active **provider**:
- `native` — the CoachOS built-in implementation.
- `external:<vendor>` — the coach's connected tool (e.g. `external:google_calendar`, `external:stripe`, `external:zoom`, `external:calendly`).

Define a TypeScript interface per capability and one implementation per provider. Features depend only on the interface, resolved at runtime from `workspace_config`.

```ts
// lib/integrations/calendar/types.ts
export interface CalendarProvider {
  id: 'native' | 'google_calendar' | 'microsoft_outlook';
  createEvent(input: CreateEventInput): Promise<CalendarEvent>;
  updateEvent(id: string, input: UpdateEventInput): Promise<CalendarEvent>;
  deleteEvent(id: string): Promise<void>;
  listBusy(range: DateRange): Promise<BusySlot[]>;
}

// lib/integrations/registry.ts
export function getProvider<C extends Capability>(
  workspaceId: string,
  capability: C
): ProviderFor<C> { /* read workspace_config, return the right adapter */ }
```

Provider matrix to support (build native first, add externals over phases):

| Capability | Native (ours) | External options |
|---|---|---|
| Calendar | CoachOS calendar | Google Calendar, Microsoft Outlook |
| Scheduling | CoachOS booking pages | Calendly, Cal.com |
| Video | Daily.co rooms | Zoom, Google Meet |
| Payments | Stripe Connect (hosted) | coach's own Stripe / Razorpay |
| Email | Resend (from our domain / coach subdomain) | Gmail, Outlook send |
| Transcription | Deepgram | uploaded transcript |
| Storage | Supabase Storage | Google Drive |

Store connected-account credentials (OAuth tokens) in an `integrations` table, encrypted at rest, one row per (workspace, capability, provider). Refresh tokens handled centrally.

**Onboarding decides the defaults:** if a coach says "I already use Calendly and Zoom", we pre-select those externals and walk them through connecting. If they say "I don't use anything yet", we default them to native providers so they're productive on day one.

---

## 6. Adaptive onboarding and dynamic views

### Onboarding flow
A multi-step wizard captured into a single `workspace_config` record:

1. **Coach type** (from the archetype list) → sets terminology + default enabled modules.
2. **What do you sell?** 1:1 sessions / packages / group programs / courses / consulting retainers → toggles Programs, Cohorts, Invoicing.
3. **Which tools do you use today?** (calendar, video, payments, scheduling) → sets provider preferences per capability (Section 5).
4. **How do you work?** session length defaults, timezone, currency, working hours.
5. **Branding** — name, logo, accent color for booking page + client portal.

### `workspace_config` drives the UI
```jsonc
{
  "archetype": "fitness",
  "terminology": { "client": "client", "session": "session", "program": "program" },
  "enabledModules": ["clients", "sessions", "scheduling", "programs", "payments", "feedback"],
  "defaultDashboardWidgets": ["today_sessions", "active_clients", "checkins_due", "revenue_mtd"],
  "providers": {
    "calendar": "google_calendar",
    "video": "native",
    "payments": "stripe_connect",
    "scheduling": "native"
  },
  "currency": "USD",
  "sessionDefaults": { "durationMin": 50 }
}
```

- Navigation renders only `enabledModules`.
- All UI labels read from `terminology` (a `useTerminology()` hook / server helper). Never hardcode "client".
- The dashboard composes from `defaultDashboardWidgets`.
- Modules can be toggled later in Settings — config is the single source of truth.

Design the config as a versioned, validated (`zod`) object so new fields are safe to add.

---

## 7. Tech stack (current as of August 2026)

Pin these. They are the current stable, modern SaaS defaults.

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions, Turbopack default). Requires **Node.js 20+**.
- **UI runtime:** React 19.
- **Language:** TypeScript (strict).
- **Styling:** Tailwind CSS v4 (CSS-first config via `@theme` in `globals.css`, OKLCH colors — no `tailwind.config.js`).
- **Components:** shadcn/ui (Tailwind v4 setup, `tw-animate-css` for animation, `next-themes` for dark mode with `@custom-variant dark`).
- **Icons:** lucide-react.
- **Database:** PostgreSQL via **Supabase** (managed Postgres + Auth + Storage + Realtime).
- **ORM / migrations:** Drizzle ORM for typed schema, queries, and migrations against the Supabase Postgres URL.
- **Auth:** Supabase Auth (email/password, magic link, Google OAuth). Middleware-protected app routes.
- **Multi-tenancy:** application-layer scoping by `workspace_id` on every query **plus** Postgres RLS as defense-in-depth.
- **Payments:** Stripe (Stripe Connect Express for coach payouts). Razorpay adapter later.
- **Video:** Daily.co (native), adapters for Zoom / Google Meet.
- **Calendar:** Google Calendar API (native/first external), adapter interface for Outlook.
- **Email:** Resend (transactional + sequences), React Email for templates.
- **Background jobs / scheduling:** Inngest (reminders, sequences, AI jobs, sync).
- **AI:** Anthropic Claude API (notes, drafts, summaries), Deepgram (transcription).
- **Validation / forms:** zod + react-hook-form.
- **Client data fetching:** prefer Server Components + Server Actions; TanStack Query only where client-side caching is genuinely needed.
- **Analytics / product:** PostHog.
- **Error monitoring:** Sentry.
- **Hosting:** Vercel (app) + Supabase (data). Inngest Cloud for jobs.

---

## 8. Architecture

- **Monorepo-lite single Next.js app** to start (App Router). Split into packages only if it grows.
- **Route groups:**
  - `(marketing)` — public landing/pricing.
  - `(auth)` — sign in / sign up / onboarding.
  - `(app)` — the authenticated coach workspace (all modules).
  - `(portal)` — the client-facing portal (separate auth context, scoped to one workspace).
  - `book/[workspaceSlug]` — public booking pages.
  - `api/webhooks/*` — Stripe, calendar, Deepgram, Inngest.
- **Tenancy model:** one `workspace` per coach account (a coach can have team members in Phase 3). The current workspace is resolved from the session and set in a request context; every data access uses it.
- **Data access layer:** all DB access goes through `lib/db/queries/*` functions that take `workspaceId` as the first argument. UI/actions never build raw queries inline.
- **Provider registry** (Section 5) resolves capabilities per workspace.
- **Jobs:** Inngest functions for reminders, no-show detection, calendar sync, transcript processing, AI generation. No hand-rolled cron.

---

## 9. Database schema (Postgres / Drizzle)

Core tables. Every workspace-owned table has `workspace_id uuid not null references workspaces(id)`, `created_at`, `updated_at`. Enable RLS on all of them.

```sql
-- Tenancy & identity
workspaces        (id, slug unique, name, owner_user_id, branding jsonb, created_at, updated_at)
workspace_config  (workspace_id pk/fk, archetype, terminology jsonb, enabled_modules text[],
                   dashboard_widgets text[], providers jsonb, currency, session_defaults jsonb, version)
users             (id, email, full_name, avatar_url)                 -- Supabase auth users mirror
memberships       (id, workspace_id, user_id, role)                  -- owner|admin|coach (Phase 3 teams)

-- Clients
clients           (id, workspace_id, full_name, email, phone, avatar_url, timezone,
                   status, tags text[], custom_fields jsonb, notes_summary, created_at, updated_at)

-- Sessions & scheduling
sessions          (id, workspace_id, client_id, enrollment_id nullable, title, type,
                   status, scheduled_at, duration_min, video_url, calendar_event_id,
                   agenda, private_notes, shared_notes, ai_generated boolean, created_at, updated_at)
action_items      (id, workspace_id, client_id, session_id nullable, title, due_at, done boolean)
availability      (id, workspace_id, weekday, start_time, end_time, buffer_min, min_notice_min, max_per_day)
bookings          (id, workspace_id, client_id, session_id, status, source, created_at)

-- Programs & payments
packages          (id, workspace_id, name, session_count, price_cents, currency, validity_days, active)
enrollments       (id, workspace_id, client_id, package_id, sessions_used, sessions_total,
                   status, started_at, expires_at)
invoices          (id, workspace_id, client_id, amount_cents, currency, status, due_at,
                   stripe_invoice_id, created_at)
payments          (id, workspace_id, client_id, invoice_id nullable, amount_cents, currency,
                   status, provider, provider_ref, paid_at)

-- Feedback, goals, forms
forms             (id, workspace_id, type, title, schema jsonb)      -- intake|feedback|survey
form_responses    (id, workspace_id, client_id, form_id, answers jsonb, submitted_at)
goals             (id, workspace_id, client_id, title, target, current, unit, status, due_at)
progress_entries  (id, workspace_id, client_id, goal_id nullable, metric, value, recorded_at)

-- Communication & docs
messages          (id, workspace_id, client_id, direction, channel, subject, body, sent_at)
documents         (id, workspace_id, client_id nullable, name, url, kind, esign_status)

-- Integrations & AI & automation
integrations      (id, workspace_id, capability, provider, account_ref, credentials jsonb_encrypted, status)
automations       (id, workspace_id, name, trigger jsonb, actions jsonb, enabled)
ai_jobs           (id, workspace_id, kind, input_ref, status, result jsonb, error, created_at)
activity_log      (id, workspace_id, client_id nullable, actor, verb, meta jsonb, created_at)  -- powers the timeline
```

**RLS pattern:** policies allow access only where `workspace_id` is in the set of workspaces the current `auth.uid()` is a member of. Client-portal access is scoped to the specific `client_id` linked to the portal user.

---

## 10. UI / UX direction (modern, 2026)

- **Aesthetic:** clean, flat, spacious. Light + dark mode from day one (OKLCH tokens). No heavy skeuomorphism, no gradients-as-decoration. Think Linear / Notion / modern shadcn — calm, high-contrast, generous whitespace.
- **Layout:** left sidebar (module nav from `enabledModules`), top bar with workspace switcher + global search + quick-add, main content. Fully responsive; sidebar collapses to a bottom bar / drawer on mobile.
- **Client-centric navigation:** the client detail page is the heart — a left rail of client info, a central **timeline**, and right-rail quick actions (book session, add note, request payment).
- **Command palette** (`Cmd/Ctrl-K`) for navigation and quick-add.
- **Empty states** that teach (each module's first-run explains itself and offers a primary action).
- **AI surfaces** as calm, dismissible panels ("AI prep", "suggested follow-up") — assistive, never in the way.
- **Booking page + client portal** inherit the workspace's branding (logo, accent color).
- Accessibility: keyboard-navigable, focus-visible rings, semantic HTML, WCAG-AA contrast.

---

## 11. Environment variables

Create `.env.local` (and document in `README.md`). Do not commit secrets.

```bash
# Core
NEXT_PUBLIC_APP_URL=
DATABASE_URL=                     # Supabase Postgres connection string (for Drizzle)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth (Google OAuth via Supabase)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=

# Calendar / video
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
DAILY_API_KEY=

# Email
RESEND_API_KEY=

# AI
ANTHROPIC_API_KEY=
DEEPGRAM_API_KEY=

# Jobs / analytics / monitoring
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
SENTRY_DSN=
```

---

## 12. Suggested project structure

```
coachos/
  app/
    (marketing)/
    (auth)/
      sign-in/  sign-up/  onboarding/
    (app)/
      dashboard/  clients/  sessions/  calendar/
      programs/  payments/  feedback/  settings/
    (portal)/
    book/[workspaceSlug]/
    api/webhooks/{stripe,calendar,deepgram,inngest}/
  components/
    ui/            # shadcn components
    modules/       # feature components (clients, sessions, ...)
    layout/
  lib/
    db/
      schema.ts    # Drizzle schema
      queries/     # workspace-scoped data access
    integrations/  # provider interfaces + adapters + registry
    ai/            # Claude + Deepgram helpers
    config/        # workspace_config + terminology + zod schemas
    auth/
    inngest/       # job functions
  DECISIONS.md
  README.md
```

---

## 13. Build phases

### Phase 0 — Foundation
- Next.js 16 + TS + Tailwind v4 + shadcn/ui + dark mode.
- Supabase project, Drizzle schema for `workspaces`, `workspace_config`, `users`, `memberships`, `clients`, `sessions`, `action_items`. RLS enabled.
- Supabase Auth (email + Google). Middleware-protected `(app)` group. Workspace resolution + request context.
- App shell: sidebar + top bar + command palette, config-driven nav, light/dark.

### Phase 1 — MVP (make one coach fully productive)
- **Onboarding wizard** → writes `workspace_config` (archetype, terminology, providers, branding).
- **Clients:** list, detail with timeline, create/edit, intake form, tags/status.
- **Sessions:** create/edit, private + shared notes, action items, link to client, mark complete/no-show.
- **Scheduling:** availability rules, public booking page, Google Calendar sync (native provider), Daily.co video link on booking, email reminders via Resend.
- **Payments (basic):** Stripe Connect onboarding for the coach + one-off payment links.
- **Dashboard (basic):** today's sessions, active clients, revenue MTD, quick actions.
- **Integration registry** in place with `native` + `google_calendar` + `stripe_connect` + `daily` providers wired through interfaces.
- **Deploy** to Vercel + Supabase; Sentry + PostHog live.
> Ship this to 5–10 real coaches before Phase 2.

### Phase 2 — Depth
- Programs/packages + enrollments (sessions-remaining tracking).
- Client portal (book, view notes/homework, pay, message).
- Feedback forms + goals + progress charts.
- Invoicing, subscriptions/retainers, richer payment reporting.
- Communication: templates, in-app messaging, automated reminders/follow-ups.
- Documents + e-signature.
- More providers: Calendly, Cal.com, Zoom, Outlook, Google Meet adapters.

### Phase 3 — Intelligence & scale
- AI layer: transcript → notes/summary/action items, prep briefs, drafted follow-ups, feedback sentiment, progress reports (Deepgram + Claude + `ai_jobs` + Inngest).
- Automations rule builder.
- Teams / multi-coach workspaces + roles.
- Razorpay + WhatsApp (India lane), white-label, analytics suite.
- Native mobile (later).

---

## 14. MVP definition of done

A single solo coach can, without touching any other tool:
1. Sign up, complete onboarding, and land in a workspace themed to their coach type.
2. Add a client and see a unified client timeline.
3. Publish a booking page; a client books; it lands on the coach's Google Calendar with a video link and sends reminders.
4. Run the session, write private + shared notes, assign action items.
5. Connect Stripe and collect a one-off payment.
6. See today's sessions, active clients, and revenue on the dashboard.
7. Everything is workspace-scoped, mobile-responsive, and works in light + dark mode.

---

*Build order is law: Phase 0 → Phase 1, verify against Section 14, then continue. Keep `DECISIONS.md` current.*

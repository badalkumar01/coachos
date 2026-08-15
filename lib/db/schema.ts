import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { WorkspaceConfig } from '@/lib/config/workspace-config';

/**
 * Phase 0 schema.
 *
 * Every workspace-owned table carries `workspace_id` and is indexed on it.
 * Row-level security policies are added in hand-written SQL migrations
 * (see lib/db/migrations/) — see DECISIONS.md D-004.
 */

// ---------------------------------------------------------------------------
// Shared column helpers
// ---------------------------------------------------------------------------

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const membershipRoleEnum = pgEnum('membership_role', ['owner', 'admin', 'coach']);

export const clientStatusEnum = pgEnum('client_status', [
  'lead',
  'active',
  'paused',
  'completed',
  'churned',
]);

export const sessionStatusEnum = pgEnum('session_status', [
  'scheduled',
  'completed',
  'no_show',
  'cancelled',
]);

// ---------------------------------------------------------------------------
// Tenancy & identity
// ---------------------------------------------------------------------------

/**
 * Mirror of Supabase `auth.users`. Kept in sync by a trigger installed in a SQL
 * migration; `id` is a FK onto `auth.users(id)` added there too, because Drizzle
 * does not model the `auth` schema.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  ...timestamps,
});

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /** Logo url, accent colour — drives booking page + portal theming. */
    branding: jsonb('branding')
      .$type<{ logoUrl?: string; accentColor?: string }>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    /** Set once the onboarding wizard finishes; gates the (app) routes. */
    onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('workspaces_slug_key').on(t.slug), index('workspaces_owner_idx').on(t.ownerUserId)],
);

/** One row per workspace. See lib/config/workspace-config.ts for the shape. */
export const workspaceConfig = pgTable('workspace_config', {
  workspaceId: uuid('workspace_id')
    .primaryKey()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  config: jsonb('config').$type<WorkspaceConfig>().notNull(),
  version: integer('version').notNull().default(1),
  ...timestamps,
});

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: membershipRoleEnum('role').notNull().default('owner'),
    ...timestamps,
  },
  (t) => [
    unique('memberships_workspace_user_key').on(t.workspaceId, t.userId),
    index('memberships_user_idx').on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    avatarUrl: text('avatar_url'),
    timezone: text('timezone'),
    status: clientStatusEnum('status').notNull().default('lead'),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    customFields: jsonb('custom_fields')
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    /** Rolling AI/manual summary shown at the top of the client detail page. */
    notesSummary: text('notes_summary'),
    ...timestamps,
  },
  (t) => [
    index('clients_workspace_idx').on(t.workspaceId),
    index('clients_workspace_status_idx').on(t.workspaceId, t.status),
  ],
);

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    /** FK added in Phase 2 when `enrollments` exists. */
    enrollmentId: uuid('enrollment_id'),
    title: text('title'),
    type: text('type'),
    status: sessionStatusEnum('status').notNull().default('scheduled'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    durationMin: integer('duration_min').notNull().default(50),
    videoUrl: text('video_url'),
    calendarEventId: text('calendar_event_id'),
    agenda: text('agenda'),
    /** Never leaves the coach's workspace. */
    privateNotes: text('private_notes'),
    /** Visible to the client in the portal (Phase 2). */
    sharedNotes: text('shared_notes'),
    /** Reserved for the Phase 3 AI layer. */
    aiGenerated: boolean('ai_generated').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index('sessions_workspace_scheduled_idx').on(t.workspaceId, t.scheduledAt),
    index('sessions_workspace_client_idx').on(t.workspaceId, t.clientId),
  ],
);

// ---------------------------------------------------------------------------
// Action items
// ---------------------------------------------------------------------------

export const actionItems = pgTable(
  'action_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }),
    done: boolean('done').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index('action_items_workspace_client_idx').on(t.workspaceId, t.clientId),
    index('action_items_workspace_done_idx').on(t.workspaceId, t.done),
  ],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Membership = typeof memberships.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type ActionItem = typeof actionItems.$inferSelect;
export type NewActionItem = typeof actionItems.$inferInsert;
export type ClientStatus = (typeof clientStatusEnum.enumValues)[number];
export type SessionStatus = (typeof sessionStatusEnum.enumValues)[number];

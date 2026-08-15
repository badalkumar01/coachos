import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { memberships, users, workspaceConfig, workspaces } from '@/lib/db/schema';
import {
  CONFIG_VERSION,
  configFromArchetype,
  parseWorkspaceConfig,
  type WorkspaceConfig,
} from '@/lib/config/workspace-config';
import type { Membership, Workspace } from '@/lib/db/schema';

/**
 * Workspace-level data access.
 *
 * These are the only queries in the codebase that are *not* scoped by
 * workspace_id, because they are what resolves the workspace in the first
 * place — they are all scoped by `userId` instead.
 */

/** A workspace as seen without an authenticated member (booking pages). */
export interface PublicWorkspace {
  workspace: Workspace;
  config: WorkspaceConfig;
}

export interface WorkspaceWithConfig extends PublicWorkspace {
  membership: Membership;
}

/** The workspaces this user is a member of, most recently created first. */
export async function listWorkspacesForUser(userId: string): Promise<WorkspaceWithConfig[]> {
  const rows = await db
    .select({ workspace: workspaces, membership: memberships, config: workspaceConfig.config })
    .from(memberships)
    .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceId))
    .leftJoin(workspaceConfig, eq(workspaceConfig.workspaceId, workspaces.id))
    .where(eq(memberships.userId, userId))
    .orderBy(workspaces.createdAt);

  return rows.map((row) => ({
    workspace: row.workspace,
    membership: row.membership,
    config: parseWorkspaceConfig(row.config),
  }));
}

/** A specific workspace, but only if this user is a member of it. */
export async function getWorkspaceForUser(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceWithConfig | null> {
  const [row] = await db
    .select({ workspace: workspaces, membership: memberships, config: workspaceConfig.config })
    .from(memberships)
    .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceId))
    .leftJoin(workspaceConfig, eq(workspaceConfig.workspaceId, workspaces.id))
    .where(and(eq(memberships.userId, userId), eq(memberships.workspaceId, workspaceId)))
    .limit(1);

  if (!row) return null;
  return {
    workspace: row.workspace,
    membership: row.membership,
    config: parseWorkspaceConfig(row.config),
  };
}

/** Public lookup for booking pages — no auth, no private fields. */
export async function getWorkspaceBySlug(slug: string): Promise<PublicWorkspace | null> {
  const [row] = await db
    .select({ workspace: workspaces, config: workspaceConfig.config })
    .from(workspaces)
    .leftJoin(workspaceConfig, eq(workspaceConfig.workspaceId, workspaces.id))
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!row) return null;
  return { workspace: row.workspace, config: parseWorkspaceConfig(row.config) };
}

/**
 * Creates the workspace, its owner membership and a default config in one
 * transaction. Called once, right after sign-up.
 */
export async function createWorkspaceForUser(input: {
  userId: string;
  name: string;
  slug: string;
}): Promise<WorkspaceWithConfig> {
  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({ name: input.name, slug: input.slug, ownerUserId: input.userId })
      .returning();

    const [membership] = await tx
      .insert(memberships)
      .values({ workspaceId: workspace.id, userId: input.userId, role: 'owner' })
      .returning();

    const config = configFromArchetype('life');
    await tx
      .insert(workspaceConfig)
      .values({ workspaceId: workspace.id, config, version: CONFIG_VERSION });

    return { workspace, membership, config };
  });
}

/** Overwrites the config for a workspace. Validated before it is written. */
export async function saveWorkspaceConfig(
  workspaceId: string,
  next: WorkspaceConfig,
): Promise<WorkspaceConfig> {
  const config = parseWorkspaceConfig(next);
  await db
    .insert(workspaceConfig)
    .values({ workspaceId, config, version: config.version })
    .onConflictDoUpdate({
      target: workspaceConfig.workspaceId,
      set: { config, version: config.version, updatedAt: new Date() },
    });
  return config;
}

export async function markWorkspaceOnboarded(workspaceId: string): Promise<void> {
  await db
    .update(workspaces)
    .set({ onboardedAt: new Date(), updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId));
}

export async function updateWorkspaceProfile(
  workspaceId: string,
  input: { name?: string; branding?: { logoUrl?: string; accentColor?: string } },
): Promise<void> {
  await db
    .update(workspaces)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId));
}

/** Mirrors the Supabase auth user into our `users` table. Idempotent. */
export async function upsertUser(input: {
  id: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}): Promise<void> {
  await db
    .insert(users)
    .values({
      id: input.id,
      email: input.email,
      fullName: input.fullName ?? null,
      avatarUrl: input.avatarUrl ?? null,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: input.email, updatedAt: new Date() },
    });
}

/** True if the slug is free. Used by onboarding + sign-up. */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const [row] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  return !row;
}

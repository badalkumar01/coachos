import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getWorkspaceForUser,
  listWorkspacesForUser,
  type WorkspaceWithConfig,
} from '@/lib/db/queries/workspaces';
import { createTermFormatter, type TermFormatter } from '@/lib/config/terminology';
import type { WorkspaceConfig } from '@/lib/config/workspace-config';
import type { Membership, Workspace } from '@/lib/db/schema';

export const WORKSPACE_COOKIE = 'coachos_workspace';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface WorkspaceContext {
  user: AuthUser;
  workspace: Workspace;
  membership: Membership;
  config: WorkspaceConfig;
  /** Terminology formatter — use for every client/session/program noun. */
  t: TermFormatter;
}

/**
 * The authenticated user, or null. Memoised per request so that a layout and
 * its pages share one round trip to Supabase.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const metadata = user.user_metadata as { full_name?: string; name?: string; avatar_url?: string };
  return {
    id: user.id,
    email: user.email,
    fullName: metadata.full_name ?? metadata.name ?? null,
    avatarUrl: metadata.avatar_url ?? null,
  };
});

/**
 * Resolves the request's workspace: the one named by the workspace cookie if the
 * user is still a member of it, otherwise their first workspace.
 *
 * Returns null when the user is signed out or has no workspace yet.
 */
export const getWorkspaceContext = cache(async (): Promise<WorkspaceContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const preferredId = cookieStore.get(WORKSPACE_COOKIE)?.value;

  let selected: WorkspaceWithConfig | null = null;
  if (preferredId) {
    selected = await getWorkspaceForUser(user.id, preferredId);
  }
  if (!selected) {
    const [first] = await listWorkspacesForUser(user.id);
    selected = first ?? null;
  }
  if (!selected) return null;

  return {
    user,
    workspace: selected.workspace,
    membership: selected.membership,
    config: selected.config,
    t: createTermFormatter(selected.config.terminology),
  };
});

/**
 * Workspace context or a redirect. Use in every `(app)` layout/page/action —
 * the returned `workspace.id` is the `workspaceId` every query must be scoped to.
 */
export async function requireWorkspaceContext(): Promise<WorkspaceContext> {
  const context = await getWorkspaceContext();
  if (!context) {
    const user = await getCurrentUser();
    redirect(user ? '/onboarding' : '/sign-in');
  }
  return context;
}

/** Like `requireWorkspaceContext`, but also insists onboarding is finished. */
export async function requireOnboardedWorkspace(): Promise<WorkspaceContext> {
  const context = await requireWorkspaceContext();
  if (!context.workspace.onboardedAt) redirect('/onboarding');
  return context;
}

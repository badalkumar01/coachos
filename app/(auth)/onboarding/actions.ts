'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/workspace-context';
import {
  createWorkspaceForUser,
  isSlugAvailable,
  listWorkspacesForUser,
  markWorkspaceOnboarded,
  upsertUser,
} from '@/lib/db/queries/workspaces';
import { slugify } from '@/lib/format';

export interface OnboardingState {
  error?: string;
}

const schema = z.object({
  name: z.string().trim().min(2, 'Give your practice a name.').max(80),
});

/** Finds a free slug near `base` by appending a counter. */
async function reserveSlug(base: string): Promise<string> {
  const root = slugify(base) || 'workspace';
  if (await isSlugAvailable(root)) return root;

  for (let i = 2; i < 50; i += 1) {
    const candidate = `${root}-${i}`;
    if (await isSlugAvailable(candidate)) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const parsed = schema.safeParse({ name: formData.get('name') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  // The Supabase auth user may not be mirrored yet on first sign-in.
  await upsertUser({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
  });

  const existing = await listWorkspacesForUser(user.id);
  const workspace =
    existing[0] ??
    (await createWorkspaceForUser({
      userId: user.id,
      name: parsed.data.name,
      slug: await reserveSlug(parsed.data.name),
    }));

  await markWorkspaceOnboarded(workspace.workspace.id);

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

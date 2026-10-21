'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOnboardedWorkspace } from '@/lib/auth/workspace-context';
import { getClient } from '@/lib/db/queries/clients';
import {
  createActionItem,
  createSession,
  deleteActionItem,
  deleteSession,
  getSession,
  setActionItemDone,
  updateSession,
} from '@/lib/db/queries/sessions';
import {
  actionItemSchema,
  notesFormSchema,
  sessionFormData,
  sessionFormSchema,
  sessionStatusValues,
} from '@/lib/validation/sessions';
import { wallClockToUtc } from '@/lib/time';

export interface SessionFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Set by actions that stay on the page, so the UI can confirm the write. */
  saved?: boolean;
}

function toFormState(error: z.ZodError): SessionFormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: 'Check the highlighted fields and try again.', fieldErrors };
}

/** Revalidates everywhere a session can surface. */
function revalidateSession(sessionId: string | null, clientId: string) {
  revalidatePath('/sessions');
  revalidatePath('/dashboard');
  revalidatePath(`/clients/${clientId}`);
  if (sessionId) revalidatePath(`/sessions/${sessionId}`);
}

export async function createSessionAction(
  _prev: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const { workspace, config } = await requireOnboardedWorkspace();

  const parsed = sessionFormSchema.safeParse(sessionFormData(formData));
  if (!parsed.success) return toFormState(parsed.error);

  // The client must belong to this workspace — never trust a posted id.
  const client = await getClient(workspace.id, parsed.data.clientId);
  if (!client) {
    return { error: 'That record is not in this workspace.', fieldErrors: { clientId: 'Choose someone from the list.' } };
  }

  const scheduledAt = wallClockToUtc(parsed.data.scheduledAt, config.timezone);
  if (!scheduledAt) {
    return { error: 'That date and time could not be read.', fieldErrors: { scheduledAt: 'Pick a date and time.' } };
  }

  // scheduledAt is replaced by the resolved instant, not the wall-clock string.
  const { scheduledAt: wallClock, ...rest } = parsed.data;
  void wallClock;
  const session = await createSession(workspace.id, { ...rest, scheduledAt });

  revalidateSession(session.id, client.id);
  redirect(`/sessions/${session.id}`);
}

export async function updateSessionAction(
  sessionId: string,
  _prev: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const { workspace, config } = await requireOnboardedWorkspace();

  const parsed = sessionFormSchema.safeParse(sessionFormData(formData));
  if (!parsed.success) return toFormState(parsed.error);

  const client = await getClient(workspace.id, parsed.data.clientId);
  if (!client) {
    return { error: 'That record is not in this workspace.', fieldErrors: { clientId: 'Choose someone from the list.' } };
  }

  const scheduledAt = wallClockToUtc(parsed.data.scheduledAt, config.timezone);
  if (!scheduledAt) {
    return { error: 'That date and time could not be read.', fieldErrors: { scheduledAt: 'Pick a date and time.' } };
  }

  const { scheduledAt: wallClock, ...rest } = parsed.data;
  void wallClock;
  const updated = await updateSession(workspace.id, sessionId, { ...rest, scheduledAt });
  if (!updated) return { error: 'That record no longer exists.' };

  revalidateSession(sessionId, client.id);
  redirect(`/sessions/${sessionId}`);
}

/** Saves just the two notes fields, from the session detail page. */
export async function saveNotesAction(
  sessionId: string,
  _prev: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const { workspace } = await requireOnboardedWorkspace();

  const parsed = notesFormSchema.safeParse({
    privateNotes: formData.get('privateNotes'),
    sharedNotes: formData.get('sharedNotes'),
  });
  if (!parsed.success) return toFormState(parsed.error);

  const updated = await updateSession(workspace.id, sessionId, parsed.data);
  if (!updated) return { error: 'That record no longer exists.' };

  revalidateSession(sessionId, updated.clientId);
  return { saved: true };
}

export async function setSessionStatusAction(sessionId: string, formData: FormData): Promise<void> {
  const { workspace } = await requireOnboardedWorkspace();

  const status = z.enum(sessionStatusValues).safeParse(formData.get('status'));
  if (!status.success) return;

  const updated = await updateSession(workspace.id, sessionId, { status: status.data });
  if (updated) revalidateSession(sessionId, updated.clientId);
}

export async function deleteSessionAction(sessionId: string): Promise<void> {
  const { workspace } = await requireOnboardedWorkspace();

  const session = await getSession(workspace.id, sessionId);
  if (!session) redirect('/sessions');

  await deleteSession(workspace.id, sessionId);
  revalidateSession(null, session.clientId);
  redirect(`/clients/${session.clientId}`);
}

// ---------------------------------------------------------------------------
// Action items
// ---------------------------------------------------------------------------

export async function addActionItemAction(
  sessionId: string,
  _prev: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const { workspace, config } = await requireOnboardedWorkspace();

  const session = await getSession(workspace.id, sessionId);
  if (!session) return { error: 'That record no longer exists.' };

  const parsed = actionItemSchema.safeParse({
    title: formData.get('title'),
    dueAt: formData.get('dueAt'),
  });
  if (!parsed.success) return toFormState(parsed.error);

  // A date-only value means end of that day in the coach's timezone.
  const dueAt = parsed.data.dueAt
    ? wallClockToUtc(`${parsed.data.dueAt}T23:59`, config.timezone)
    : null;

  await createActionItem(workspace.id, {
    clientId: session.clientId,
    sessionId,
    title: parsed.data.title,
    dueAt,
  });

  revalidateSession(sessionId, session.clientId);
  return {};
}

/**
 * Bound with `sessionId` by the page; the row's own form supplies
 * `actionItemId` and the desired `done` value.
 */
export async function toggleActionItemAction(
  sessionId: string,
  formData: FormData,
): Promise<void> {
  const { workspace } = await requireOnboardedWorkspace();

  const actionItemId = z.string().uuid().safeParse(formData.get('actionItemId'));
  if (!actionItemId.success) return;

  const done = formData.get('done') === 'true';
  const updated = await setActionItemDone(workspace.id, actionItemId.data, done);

  if (updated) revalidateSession(sessionId, updated.clientId);
}

/** Bound with `sessionId` and `clientId` by the page, then `actionItemId` by the row. */
export async function removeActionItemAction(
  sessionId: string,
  clientId: string,
  actionItemId: string,
): Promise<void> {
  const { workspace } = await requireOnboardedWorkspace();

  await deleteActionItem(workspace.id, actionItemId);
  revalidateSession(sessionId, clientId);
}

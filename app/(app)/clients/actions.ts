'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireOnboardedWorkspace } from '@/lib/auth/workspace-context';
import { createClient, deleteClient, updateClient } from '@/lib/db/queries/clients';
import { clientFormData, clientFormSchema } from '@/lib/validation/clients';

export interface ClientFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function toFormState(error: import('zod').ZodError): ClientFormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: 'Check the highlighted fields and try again.', fieldErrors };
}

export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { workspace } = await requireOnboardedWorkspace();

  const parsed = clientFormSchema.safeParse(clientFormData(formData));
  if (!parsed.success) return toFormState(parsed.error);

  const client = await createClient(workspace.id, parsed.data);

  revalidatePath('/clients');
  revalidatePath('/dashboard');
  redirect(`/clients/${client.id}`);
}

export async function updateClientAction(
  clientId: string,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { workspace } = await requireOnboardedWorkspace();

  const parsed = clientFormSchema.safeParse(clientFormData(formData));
  if (!parsed.success) return toFormState(parsed.error);

  const updated = await updateClient(workspace.id, clientId, parsed.data);
  if (!updated) return { error: 'That record no longer exists.' };

  revalidatePath('/clients');
  revalidatePath(`/clients/${clientId}`);
  revalidatePath('/dashboard');
  redirect(`/clients/${clientId}`);
}

export async function deleteClientAction(clientId: string): Promise<void> {
  const { workspace } = await requireOnboardedWorkspace();

  await deleteClient(workspace.id, clientId);

  revalidatePath('/clients');
  revalidatePath('/dashboard');
  redirect('/clients');
}

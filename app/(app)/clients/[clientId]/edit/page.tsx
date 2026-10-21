import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { ClientForm } from '@/components/modules/clients/client-form';
import { requireOnboardedWorkspace } from '@/lib/auth/workspace-context';
import { getClient } from '@/lib/db/queries/clients';
import { updateClientAction } from '../../actions';

export const metadata: Metadata = { title: 'Edit client' };

export default async function EditClientPage({
  params,
}: PageProps<'/clients/[clientId]/edit'>) {
  const { clientId } = await params;
  const { workspace, t } = await requireOnboardedWorkspace();

  const client = await getClient(workspace.id, clientId);
  if (!client) notFound();

  return (
    <>
      <PageHeader title={`Edit ${client.fullName}`} />
      <ClientForm
        action={updateClientAction.bind(null, client.id)}
        client={client}
        termTitle={t.title('client')}
        cancelHref={`/clients/${client.id}`}
        submitLabel="Save changes"
      />
    </>
  );
}

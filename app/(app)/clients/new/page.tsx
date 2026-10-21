import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { ClientForm } from '@/components/modules/clients/client-form';
import { requireOnboardedWorkspace } from '@/lib/auth/workspace-context';
import { createClientAction } from '../actions';

export const metadata: Metadata = { title: 'New client' };

export default async function NewClientPage() {
  const { t } = await requireOnboardedWorkspace();

  return (
    <>
      <PageHeader
        title={`New ${t('client')}`}
        description={`Add someone to your books. You can book ${t.plural('session')} for them straight after.`}
      />
      <ClientForm
        action={createClientAction}
        termTitle={t.title('client')}
        cancelHref="/clients"
        submitLabel={`Create ${t('client')}`}
      />
    </>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { SessionForm } from '@/components/modules/sessions/session-form';
import { requireOnboardedWorkspace } from '@/lib/auth/workspace-context';
import { listClientOptions } from '@/lib/db/queries/clients';
import { defaultSessionStart } from '@/lib/time';
import { createSessionAction } from '../actions';

export const metadata: Metadata = { title: 'New session' };

export default async function NewSessionPage({ searchParams }: PageProps<'/sessions/new'>) {
  const { workspace, config, t } = await requireOnboardedWorkspace();
  const params = await searchParams;

  const clients = await listClientOptions(workspace.id);
  const preselected = typeof params.clientId === 'string' ? params.clientId : undefined;
  const validPreselection = clients.some((client) => client.id === preselected)
    ? preselected
    : undefined;

  if (clients.length === 0) {
    return (
      <>
        <PageHeader title={`New ${t('session')}`} />
        <EmptyState
          icon={Users}
          title={`You need a ${t('client')} first`}
          description={`Every ${t('session')} belongs to someone. Add a ${t('client')} and you can book for them right away.`}
          action={
            <Button render={<Link href="/clients/new" />}>
              <Plus className="size-4" />
              New {t('client')}
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`New ${t('session')}`}
        description={`Book time with a ${t('client')} and capture the agenda up front.`}
      />
      <SessionForm
        action={createSessionAction}
        clients={clients}
        clientTerm={t('client')}
        sessionTerm={t('session')}
        timezone={config.timezone}
        cancelHref={validPreselection ? `/clients/${validPreselection}` : '/sessions'}
        submitLabel={`Book ${t('session')}`}
        defaults={{
          clientId: validPreselection,
          status: 'scheduled',
          scheduledAt: defaultSessionStart(config.timezone),
          durationMin: config.sessionDefaults.durationMin,
        }}
      />
    </>
  );
}

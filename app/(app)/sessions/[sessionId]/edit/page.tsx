import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { SessionForm } from '@/components/modules/sessions/session-form';
import { DeleteSessionButton } from '@/components/modules/sessions/delete-session-button';
import { requireOnboardedWorkspace } from '@/lib/auth/workspace-context';
import { getSession } from '@/lib/db/queries/sessions';
import { listClientOptions } from '@/lib/db/queries/clients';
import { utcToWallClock } from '@/lib/time';
import { deleteSessionAction, updateSessionAction } from '../../actions';

export const metadata: Metadata = { title: 'Edit session' };

export default async function EditSessionPage({
  params,
}: PageProps<'/sessions/[sessionId]/edit'>) {
  const { sessionId } = await params;
  const { workspace, config, t } = await requireOnboardedWorkspace();

  const [session, clients] = await Promise.all([
    getSession(workspace.id, sessionId),
    listClientOptions(workspace.id),
  ]);
  if (!session) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${t('session')}`}
        description={`With ${session.clientName}`}
      />

      <SessionForm
        action={updateSessionAction.bind(null, session.id)}
        clients={clients}
        clientTerm={t('client')}
        sessionTerm={t('session')}
        timezone={config.timezone}
        cancelHref={`/sessions/${session.id}`}
        submitLabel="Save changes"
        defaults={{
          clientId: session.clientId,
          title: session.title,
          type: session.type,
          status: session.status,
          scheduledAt: utcToWallClock(session.scheduledAt, config.timezone),
          durationMin: session.durationMin,
          videoUrl: session.videoUrl,
          agenda: session.agenda,
          privateNotes: session.privateNotes,
          sharedNotes: session.sharedNotes,
        }}
      />

      <div className="mt-10 border-t pt-6">
        <DeleteSessionButton
          sessionTerm={t('session')}
          clientName={session.clientName}
          action={deleteSessionAction.bind(null, session.id)}
        />
      </div>
    </>
  );
}

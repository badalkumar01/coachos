import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Clock, Pencil, User, Video } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ActionItems } from '@/components/modules/sessions/action-items';
import { SessionNotes } from '@/components/modules/sessions/session-notes';
import {
  SESSION_STATUS_LABELS,
  SessionStatusBadge,
} from '@/components/modules/sessions/session-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireOnboardedWorkspace } from '@/lib/auth/workspace-context';
import { getSession, listActionItemsForSession } from '@/lib/db/queries/sessions';
import { formatDateTime, formatRelative } from '@/lib/format';
import { SESSION_STATUS_ORDER } from '@/lib/validation/sessions';
import {
  addActionItemAction,
  removeActionItemAction,
  saveNotesAction,
  setSessionStatusAction,
  toggleActionItemAction,
} from '../actions';

export async function generateMetadata({
  params,
}: PageProps<'/sessions/[sessionId]'>): Promise<Metadata> {
  const { sessionId } = await params;
  const { workspace } = await requireOnboardedWorkspace();
  const session = await getSession(workspace.id, sessionId);
  return { title: session ? `${session.clientName} · session` : 'Session' };
}

export default async function SessionDetailPage({ params }: PageProps<'/sessions/[sessionId]'>) {
  const { sessionId } = await params;
  const { workspace, config, t } = await requireOnboardedWorkspace();

  const session = await getSession(workspace.id, sessionId);
  if (!session) notFound();

  const items = await listActionItemsForSession(workspace.id, sessionId);
  const tz = config.timezone;
  const now = new Date();

  const dueLabels: Record<string, string> = {};
  const overdueIds: string[] = [];
  for (const item of items) {
    if (!item.dueAt) continue;
    dueLabels[item.id] = formatDateTime(item.dueAt, tz);
    if (item.dueAt < now) overdueIds.push(item.id);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground -ml-2 mb-2"
        render={<Link href={`/clients/${session.clientId}`} />}
      >
        <ArrowLeft className="size-4" />
        {session.clientName}
      </Button>

      <PageHeader
        title={session.title ?? t.title('session')}
        description={`${formatDateTime(session.scheduledAt, tz)} · ${session.durationMin} min · ${formatRelative(session.scheduledAt)}`}
        actions={
          <Button variant="outline" render={<Link href={`/sessions/${session.id}/edit`} />}>
            <Pencil className="size-4" />
            Edit
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes</CardTitle>
              <CardDescription>
                Private notes stay with you; shared notes go to the {t('client')}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SessionNotes
                action={saveNotesAction.bind(null, session.id)}
                privateNotes={session.privateNotes}
                sharedNotes={session.sharedNotes}
                clientTerm={t('client')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Action items</CardTitle>
              <CardDescription>What the {t('client')} is taking away</CardDescription>
            </CardHeader>
            <CardContent>
              <ActionItems
                items={items}
                addAction={addActionItemAction.bind(null, session.id)}
                toggleAction={toggleActionItemAction.bind(null, session.id)}
                removeAction={removeActionItemAction.bind(null, session.id, session.clientId)}
                dueLabels={dueLabels}
                overdueIds={overdueIds}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <SessionStatusBadge status={session.status} className="w-fit" />
              <div className="flex flex-wrap gap-1.5">
                {SESSION_STATUS_ORDER.filter((status) => status !== session.status).map(
                  (status) => (
                    <form key={status} action={setSessionStatusAction.bind(null, session.id)}>
                      <input type="hidden" name="status" value={status} />
                      <Button type="submit" variant="outline" size="sm">
                        Mark {SESSION_STATUS_LABELS[status].toLowerCase()}
                      </Button>
                    </form>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-2.5">
                <User className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <Link
                  href={`/clients/${session.clientId}`}
                  className="underline-offset-4 hover:underline"
                >
                  {session.clientName}
                </Link>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <span>
                  {formatDateTime(session.scheduledAt, tz)}
                  <span className="text-muted-foreground block text-xs">
                    {session.durationMin} minutes · {tz}
                  </span>
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <Video className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                {session.videoUrl ? (
                  <a
                    href={session.videoUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="min-w-0 break-all underline-offset-4 hover:underline"
                  >
                    Join call
                  </a>
                ) : (
                  <span className="text-muted-foreground">No video link</span>
                )}
              </div>
            </CardContent>
          </Card>

          {session.agenda ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Agenda</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{session.agenda}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
